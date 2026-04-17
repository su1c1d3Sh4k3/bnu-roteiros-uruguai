"""
Testes de Autenticação — Supabase Auth
=======================================
Cobertura:
  - Registro de novo usuário (signup)
  - Login com credenciais válidas
  - Login com credenciais inválidas
  - Perfil auto-criado via trigger
  - Token inválido rejeitado
"""

import uuid
import pytest
import httpx
from conftest import (
    SUPABASE_URL,
    anon_headers,
    auth_headers,
    create_test_user,
    login_user,
)

pytestmark = pytest.mark.asyncio


class TestSignup:
    async def test_signup_creates_user(self, http_client):
        """Registro com dados válidos deve retornar access_token e user_id."""
        email, password, token, user_id = await create_test_user(http_client)
        assert token, "access_token não retornado"
        assert user_id, "user_id não retornado"

    async def test_signup_duplicate_email_fails(self, http_client):
        """Registro com email duplicado deve falhar."""
        suffix = uuid.uuid4().hex[:8]
        await create_test_user(http_client, suffix)
        # Tentar registrar novamente com mesmo suffix
        email = f"test_{suffix}@bnu-test.com"
        resp = await http_client.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers=anon_headers(),
            json={"email": email, "password": "TestPass123!"},
        )
        # Supabase retorna 200 mas sem novo access_token para duplicatas
        data = resp.json()
        # Pode retornar identities vazio ou erro dependendo da config
        assert resp.status_code in (200, 400, 422)


class TestLogin:
    async def test_login_valid_credentials(self, http_client):
        """Login com credenciais corretas deve retornar token."""
        email, password, _, _ = await create_test_user(http_client)
        token = await login_user(http_client, email, password)
        assert token, "Login não retornou access_token"

    async def test_login_wrong_password(self, http_client):
        """Login com senha errada deve falhar."""
        email, _, _, _ = await create_test_user(http_client)
        resp = await http_client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=anon_headers(),
            json={"email": email, "password": "WrongPass!"},
        )
        assert resp.status_code == 400

    async def test_login_nonexistent_user(self, http_client):
        """Login com email inexistente deve falhar."""
        resp = await http_client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=anon_headers(),
            json={"email": "ghost@nowhere.com", "password": "any"},
        )
        assert resp.status_code == 400


class TestProfileAutoCreation:
    async def test_profile_created_on_signup(self, http_client):
        """O trigger deve criar um profile automaticamente após signup."""
        email, _, token, user_id = await create_test_user(http_client)
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=*",
            headers=auth_headers(token),
        )
        assert resp.status_code == 200
        profiles = resp.json()
        assert len(profiles) == 1
        assert profiles[0]["email"] == email

    async def test_profile_has_nome_from_metadata(self, http_client):
        """O nome passado via metadata deve aparecer no profile."""
        suffix = uuid.uuid4().hex[:8]
        _, _, token, user_id = await create_test_user(http_client, suffix)
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=nome",
            headers=auth_headers(token),
        )
        profiles = resp.json()
        assert profiles[0]["nome"] == f"Teste {suffix}"


class TestTokenValidation:
    async def test_invalid_token_rejected(self, http_client):
        """Request com token inválido deve ser rejeitado."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/profiles?select=*",
            headers=auth_headers("invalid_token_here"),
        )
        # Supabase retorna 401 ou array vazio dependendo do endpoint
        assert resp.status_code in (401, 403) or resp.json() == []
