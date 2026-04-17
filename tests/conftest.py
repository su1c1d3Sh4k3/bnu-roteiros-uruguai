"""
Fixtures compartilhadas para todos os testes.
Configura clientes HTTP, autenticação e helpers.
"""

import os
import uuid
import pytest
import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Variáveis de Ambiente ────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:54321")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# ── Headers base ─────────────────────────────────────────────────
def anon_headers():
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }


def auth_headers(access_token: str):
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }


def service_headers():
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


# ── Helper: criar usuário de teste ──────────────────────────────
async def create_test_user(client: httpx.AsyncClient, suffix: str = ""):
    """Registra um usuário de teste e retorna (email, password, access_token, user_id)."""
    unique = suffix or uuid.uuid4().hex[:8]
    email = f"test_{unique}@bnu-test.com"
    password = "TestPass123!"

    resp = await client.post(
        f"{SUPABASE_URL}/auth/v1/signup",
        headers=anon_headers(),
        json={
            "email": email,
            "password": password,
            "data": {"nome": f"Teste {unique}"},
        },
    )
    data = resp.json()
    access_token = data.get("access_token", "")
    user_id = data.get("user", {}).get("id", "")
    return email, password, access_token, user_id


async def login_user(client: httpx.AsyncClient, email: str, password: str):
    """Faz login e retorna access_token."""
    resp = await client.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers=anon_headers(),
        json={"email": email, "password": password},
    )
    return resp.json().get("access_token", "")


# ── Fixtures ─────────────────────────────────────────────────────
@pytest.fixture
def supabase_url():
    return SUPABASE_URL


@pytest.fixture
def frontend_url():
    return FRONTEND_URL


@pytest.fixture
async def http_client():
    async with httpx.AsyncClient(timeout=30) as client:
        yield client


@pytest.fixture
async def authed_user(http_client):
    """Cria um usuário autenticado e retorna dict com dados."""
    email, password, token, user_id = await create_test_user(http_client)
    return {
        "email": email,
        "password": password,
        "token": token,
        "user_id": user_id,
    }


@pytest.fixture
async def second_user(http_client):
    """Segundo usuário para testes de isolamento RLS."""
    email, password, token, user_id = await create_test_user(http_client, "second")
    return {
        "email": email,
        "password": password,
        "token": token,
        "user_id": user_id,
    }
