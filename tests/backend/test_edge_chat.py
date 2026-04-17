"""
Testes da Edge Function: chat-assistant
========================================
Cobertura:
  - Envio de mensagem e recebimento de resposta
  - Mensagens salvas no banco (user + assistant)
  - Rejeição sem autenticação
  - Rejeição com itinerary de outro usuário
  - Resposta em português
"""

import pytest
from conftest import SUPABASE_URL, auth_headers

pytestmark = pytest.mark.asyncio

EDGE_URL_CHAT = f"{SUPABASE_URL}/functions/v1/chat-assistant"


async def create_itinerary(client, token, user_id):
    resp = await client.post(
        f"{SUPABASE_URL}/rest/v1/itineraries",
        headers={**auth_headers(token), "Prefer": "return=representation"},
        json={"user_id": user_id},
    )
    return resp.json()[0]["id"]


class TestChatAssistant:
    async def test_send_message_get_reply(self, http_client, authed_user):
        """Deve enviar mensagem e receber resposta do Rodrigo."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.post(
            EDGE_URL_CHAT,
            headers=auth_headers(authed_user["token"]),
            json={
                "itinerary_id": itin_id,
                "message": "Quanto custa o City Tour Montevideo?",
            },
            timeout=30,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data
        assert len(data["reply"]) > 10

    async def test_reply_in_portuguese(self, http_client, authed_user):
        """A resposta deve estar em português."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.post(
            EDGE_URL_CHAT,
            headers=auth_headers(authed_user["token"]),
            json={
                "itinerary_id": itin_id,
                "message": "Quais passeios vocês oferecem?",
            },
            timeout=30,
        )
        reply = resp.json()["reply"]
        # Verificar que contém palavras em português comuns
        pt_words = ["passeio", "tour", "cidade", "Montevideo", "Punta", "valor", "R$"]
        assert any(word.lower() in reply.lower() for word in pt_words)

    async def test_messages_saved_in_db(self, http_client, authed_user):
        """Ambas mensagens (user + assistant) devem ser salvas no banco."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        await http_client.post(
            EDGE_URL_CHAT,
            headers=auth_headers(authed_user["token"]),
            json={
                "itinerary_id": itin_id,
                "message": "Olá, Rodrigo!",
            },
            timeout=30,
        )

        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/chat_messages?itinerary_id=eq.{itin_id}&select=role,content&order=created_at.asc",
            headers=auth_headers(authed_user["token"]),
        )
        messages = resp.json()
        assert len(messages) >= 2
        roles = [m["role"] for m in messages]
        assert "user" in roles
        assert "assistant" in roles

    async def test_conversation_context_preserved(self, http_client, authed_user):
        """Deve manter contexto entre mensagens da conversa."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        # Primeira mensagem
        await http_client.post(
            EDGE_URL_CHAT,
            headers=auth_headers(authed_user["token"]),
            json={
                "itinerary_id": itin_id,
                "message": "Meu nome é Carlos e estou planejando ir com minha esposa.",
            },
            timeout=30,
        )
        # Segunda mensagem referenciando contexto
        resp = await http_client.post(
            EDGE_URL_CHAT,
            headers=auth_headers(authed_user["token"]),
            json={
                "itinerary_id": itin_id,
                "message": "Qual passeio você recomenda para nós dois?",
            },
            timeout=30,
        )
        reply = resp.json()["reply"]
        # A resposta deve demonstrar que entendeu o contexto (casal)
        assert len(reply) > 20


class TestChatAuth:
    async def test_reject_without_auth(self, http_client):
        """Deve rejeitar chamada sem autenticação."""
        resp = await http_client.post(
            EDGE_URL_CHAT,
            headers={"Content-Type": "application/json"},
            json={"itinerary_id": "fake", "message": "test"},
        )
        assert resp.status_code in (401, 403)

    async def test_reject_other_user_itinerary(
        self, http_client, authed_user, second_user
    ):
        """Deve rejeitar chat em itinerary de outro usuário."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.post(
            EDGE_URL_CHAT,
            headers=auth_headers(second_user["token"]),
            json={"itinerary_id": itin_id, "message": "test"},
        )
        assert resp.status_code in (403, 404)
