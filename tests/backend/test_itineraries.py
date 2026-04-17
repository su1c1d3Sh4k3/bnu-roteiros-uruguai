"""
Testes de Itineraries — CRUD e ciclo de vida
=============================================
Cobertura:
  - Criar itinerary
  - Listar itineraries do usuário
  - Atualizar status
  - Deletar itinerary
  - RLS: não ver roteiro de outro usuário
"""

import pytest
from conftest import SUPABASE_URL, auth_headers

pytestmark = pytest.mark.asyncio


async def create_itinerary(client, token, user_id):
    """Helper: cria um itinerary e retorna o id."""
    resp = await client.post(
        f"{SUPABASE_URL}/rest/v1/itineraries",
        headers={**auth_headers(token), "Prefer": "return=representation"},
        json={"user_id": user_id},
    )
    assert resp.status_code == 201
    return resp.json()[0]["id"]


class TestCreateItinerary:
    async def test_create_itinerary(self, http_client, authed_user):
        """Deve criar um itinerary com status 'draft'."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        assert itin_id

    async def test_default_status_is_draft(self, http_client, authed_user):
        """Status padrão deve ser 'draft'."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}&select=status",
            headers=auth_headers(authed_user["token"]),
        )
        assert resp.json()[0]["status"] == "draft"


class TestListItineraries:
    async def test_list_own_itineraries(self, http_client, authed_user):
        """Deve listar apenas roteiros do próprio usuário."""
        await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itineraries?select=*&order=created_at.desc",
            headers=auth_headers(authed_user["token"]),
        )
        assert len(resp.json()) >= 2
        for itin in resp.json():
            assert itin["user_id"] == authed_user["user_id"]


class TestUpdateItinerary:
    async def test_update_status_to_generated(self, http_client, authed_user):
        """Deve permitir atualizar status para 'generated'."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.patch(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}",
            headers={**auth_headers(authed_user["token"]), "Prefer": "return=representation"},
            json={"status": "generated", "generated_result": "Roteiro de teste"},
        )
        assert resp.status_code == 200
        assert resp.json()[0]["status"] == "generated"

    async def test_update_status_to_sent(self, http_client, authed_user):
        """Deve permitir atualizar status para 'sent_to_consultant'."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.patch(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}",
            headers={**auth_headers(authed_user["token"]), "Prefer": "return=representation"},
            json={"status": "sent_to_consultant"},
        )
        assert resp.status_code == 200
        assert resp.json()[0]["status"] == "sent_to_consultant"

    async def test_invalid_status_rejected(self, http_client, authed_user):
        """Status inválido deve ser rejeitado pelo CHECK constraint."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.patch(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}",
            headers=auth_headers(authed_user["token"]),
            json={"status": "invalid_status"},
        )
        assert resp.status_code in (400, 409)


class TestDeleteItinerary:
    async def test_delete_own_itinerary(self, http_client, authed_user):
        """Deve permitir deletar o próprio itinerary."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}",
            headers=auth_headers(authed_user["token"]),
        )
        assert resp.status_code in (200, 204)

        # Verificar que foi deletado
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}&select=id",
            headers=auth_headers(authed_user["token"]),
        )
        assert resp.json() == []


class TestRLSIsolation:
    async def test_cannot_see_other_user_itinerary(
        self, http_client, authed_user, second_user
    ):
        """Usuário não deve ver roteiros de outro usuário."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        # Segundo usuário tenta acessar
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}&select=*",
            headers=auth_headers(second_user["token"]),
        )
        assert resp.json() == []

    async def test_cannot_update_other_user_itinerary(
        self, http_client, authed_user, second_user
    ):
        """Usuário não deve conseguir atualizar roteiro de outro."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.patch(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}",
            headers=auth_headers(second_user["token"]),
            json={"status": "generated"},
        )
        # Deve retornar vazio (nenhuma row afetada) ou 404
        assert resp.status_code in (200, 204)
        # Verificar que não mudou
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}&select=status",
            headers=auth_headers(authed_user["token"]),
        )
        assert resp.json()[0]["status"] == "draft"

    async def test_cannot_delete_other_user_itinerary(
        self, http_client, authed_user, second_user
    ):
        """Usuário não deve conseguir deletar roteiro de outro."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}",
            headers=auth_headers(second_user["token"]),
        )
        # Verificar que ainda existe
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}&select=id",
            headers=auth_headers(authed_user["token"]),
        )
        assert len(resp.json()) == 1
