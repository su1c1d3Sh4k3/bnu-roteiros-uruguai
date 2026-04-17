"""
Testes de Chat Messages — Histórico de mensagens
=================================================
Cobertura:
  - Inserir mensagem de usuário
  - Inserir mensagem de assistente
  - Listar mensagens por itinerary_id (ordem cronológica)
  - RLS: não ler mensagens de outro usuário
  - Cascade delete: deletar itinerary remove mensagens
"""

import pytest
from conftest import SUPABASE_URL, auth_headers

pytestmark = pytest.mark.asyncio


async def create_itinerary(client, token, user_id):
    resp = await client.post(
        f"{SUPABASE_URL}/rest/v1/itineraries",
        headers={**auth_headers(token), "Prefer": "return=representation"},
        json={"user_id": user_id},
    )
    return resp.json()[0]["id"]


async def insert_message(client, token, itinerary_id, user_id, role, content):
    resp = await client.post(
        f"{SUPABASE_URL}/rest/v1/chat_messages",
        headers={**auth_headers(token), "Prefer": "return=representation"},
        json={
            "itinerary_id": itinerary_id,
            "user_id": user_id,
            "role": role,
            "content": content,
        },
    )
    assert resp.status_code == 201
    return resp.json()[0]["id"]


class TestInsertMessages:
    async def test_insert_user_message(self, http_client, authed_user):
        """Deve permitir inserir mensagem do usuário."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        msg_id = await insert_message(
            http_client,
            authed_user["token"],
            itin_id,
            authed_user["user_id"],
            "user",
            "Quanto custa o City Tour?",
        )
        assert msg_id

    async def test_insert_assistant_message(self, http_client, authed_user):
        """Deve permitir inserir mensagem do assistente."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        msg_id = await insert_message(
            http_client,
            authed_user["token"],
            itin_id,
            authed_user["user_id"],
            "assistant",
            "O City Tour Montevideo custa R$129 por pessoa!",
        )
        assert msg_id

    async def test_invalid_role_rejected(self, http_client, authed_user):
        """Role inválido deve ser rejeitado pelo CHECK constraint."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.post(
            f"{SUPABASE_URL}/rest/v1/chat_messages",
            headers={**auth_headers(authed_user["token"]), "Prefer": "return=representation"},
            json={
                "itinerary_id": itin_id,
                "user_id": authed_user["user_id"],
                "role": "system",  # inválido
                "content": "test",
            },
        )
        assert resp.status_code in (400, 409)


class TestListMessages:
    async def test_list_messages_chronological(self, http_client, authed_user):
        """Mensagens devem vir em ordem cronológica."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        await insert_message(
            http_client, authed_user["token"], itin_id,
            authed_user["user_id"], "user", "Mensagem 1"
        )
        await insert_message(
            http_client, authed_user["token"], itin_id,
            authed_user["user_id"], "assistant", "Mensagem 2"
        )
        await insert_message(
            http_client, authed_user["token"], itin_id,
            authed_user["user_id"], "user", "Mensagem 3"
        )

        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/chat_messages?itinerary_id=eq.{itin_id}&select=content,role&order=created_at.asc",
            headers=auth_headers(authed_user["token"]),
        )
        messages = resp.json()
        assert len(messages) == 3
        assert messages[0]["content"] == "Mensagem 1"
        assert messages[1]["role"] == "assistant"
        assert messages[2]["content"] == "Mensagem 3"


class TestRLSChat:
    async def test_cannot_read_other_user_messages(
        self, http_client, authed_user, second_user
    ):
        """Usuário não deve ver mensagens de outro usuário."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        await insert_message(
            http_client, authed_user["token"], itin_id,
            authed_user["user_id"], "user", "Mensagem secreta"
        )

        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/chat_messages?itinerary_id=eq.{itin_id}&select=*",
            headers=auth_headers(second_user["token"]),
        )
        assert resp.json() == []


class TestCascadeDeleteChat:
    async def test_delete_itinerary_removes_messages(self, http_client, authed_user):
        """Deletar itinerary deve remover mensagens em cascata."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        msg_id = await insert_message(
            http_client, authed_user["token"], itin_id,
            authed_user["user_id"], "user", "Será deletado"
        )

        await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}",
            headers=auth_headers(authed_user["token"]),
        )

        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/chat_messages?id=eq.{msg_id}&select=id",
            headers=auth_headers(authed_user["token"]),
        )
        assert resp.json() == []
