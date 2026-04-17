"""
Testes de RLS (Row Level Security) — Isolamento completo
=========================================================
Cobertura:
  - Catálogos: leitura pública OK, escrita rejeitada
  - Profiles: só vê o próprio
  - Itineraries: isolamento total entre usuários
  - Answers: isolamento via itinerary ownership
  - Chat: isolamento via user_id
  - Cross-user: nenhum vazamento de dados
"""

import pytest
from conftest import SUPABASE_URL, auth_headers, anon_headers

pytestmark = pytest.mark.asyncio


class TestCatalogRLS:
    async def test_authenticated_can_read_catalogs(self, http_client, authed_user):
        """Usuário autenticado pode ler todos os catálogos."""
        token = authed_user["token"]
        for table in ["cities", "tours", "hotel_styles", "travel_profiles", "budget_ranges"]:
            resp = await http_client.get(
                f"{SUPABASE_URL}/rest/v1/{table}?select=*",
                headers=auth_headers(token),
            )
            assert resp.status_code == 200
            assert len(resp.json()) > 0, f"Tabela {table} está vazia"

    async def test_anon_cannot_write_catalogs(self, http_client, authed_user):
        """Usuário autenticado (não admin) não deve conseguir inserir em catálogos."""
        token = authed_user["token"]
        resp = await http_client.post(
            f"{SUPABASE_URL}/rest/v1/cities",
            headers={**auth_headers(token), "Prefer": "return=representation"},
            json={"id": "hack", "nome": "Hack City"},
        )
        # Deve falhar: sem política INSERT para não-admin
        assert resp.status_code in (401, 403, 409)

    async def test_cannot_delete_catalog(self, http_client, authed_user):
        """Usuário não deve conseguir deletar dados de catálogo."""
        resp = await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/cities?id=eq.mvd",
            headers=auth_headers(authed_user["token"]),
        )
        # Deve falhar ou não ter efeito
        # Verificar que Montevideo ainda existe
        resp2 = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/cities?id=eq.mvd&select=id",
            headers=auth_headers(authed_user["token"]),
        )
        assert len(resp2.json()) == 1


class TestProfileRLS:
    async def test_can_read_own_profile(self, http_client, authed_user):
        """Deve conseguir ler o próprio profile."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{authed_user['user_id']}&select=*",
            headers=auth_headers(authed_user["token"]),
        )
        assert len(resp.json()) == 1

    async def test_cannot_read_other_profile(self, http_client, authed_user, second_user):
        """Não deve ver profile de outro usuário."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{second_user['user_id']}&select=*",
            headers=auth_headers(authed_user["token"]),
        )
        assert resp.json() == []

    async def test_can_update_own_profile(self, http_client, authed_user):
        """Deve conseguir atualizar o próprio profile."""
        resp = await http_client.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{authed_user['user_id']}",
            headers={**auth_headers(authed_user["token"]), "Prefer": "return=representation"},
            json={"whatsapp": "(99) 99999-9999"},
        )
        assert resp.status_code == 200
        assert resp.json()[0]["whatsapp"] == "(99) 99999-9999"

    async def test_cannot_update_other_profile(self, http_client, authed_user, second_user):
        """Não deve conseguir atualizar profile de outro."""
        resp = await http_client.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{second_user['user_id']}",
            headers={**auth_headers(authed_user["token"]), "Prefer": "return=representation"},
            json={"nome": "Hackeado"},
        )
        # Deve retornar vazio (nenhuma row afetada)
        assert resp.json() == [] or resp.status_code in (403, 404)


class TestCrossUserIsolation:
    async def test_full_isolation_scenario(self, http_client, authed_user, second_user):
        """Cenário completo: usuário A cria tudo, usuário B não vê nada."""
        token_a = authed_user["token"]
        uid_a = authed_user["user_id"]
        token_b = second_user["token"]

        # A cria itinerary
        resp = await http_client.post(
            f"{SUPABASE_URL}/rest/v1/itineraries",
            headers={**auth_headers(token_a), "Prefer": "return=representation"},
            json={"user_id": uid_a},
        )
        itin_id = resp.json()[0]["id"]

        # A cria answers
        await http_client.post(
            f"{SUPABASE_URL}/rest/v1/itinerary_answers",
            headers={**auth_headers(token_a), "Prefer": "return=representation"},
            json={"itinerary_id": itin_id, "nome": "Segredo de A"},
        )

        # A cria chat message
        await http_client.post(
            f"{SUPABASE_URL}/rest/v1/chat_messages",
            headers={**auth_headers(token_a), "Prefer": "return=representation"},
            json={
                "itinerary_id": itin_id,
                "user_id": uid_a,
                "role": "user",
                "content": "Mensagem secreta de A",
            },
        )

        # B tenta ler cada tabela
        for table, filter_col in [
            ("itineraries", "id"),
            ("itinerary_answers", "itinerary_id"),
            ("chat_messages", "itinerary_id"),
        ]:
            resp = await http_client.get(
                f"{SUPABASE_URL}/rest/v1/{table}?{filter_col}=eq.{itin_id}&select=*",
                headers=auth_headers(token_b),
            )
            assert resp.json() == [], f"B conseguiu ler {table} de A!"
