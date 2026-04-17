"""
Testes da Edge Function: send-to-consultant
=============================================
Cobertura:
  - Envio com roteiro gerado
  - Status atualizado para 'sent_to_consultant'
  - consultant_response e sent_at preenchidos
  - Rejeição sem roteiro gerado (status != generated)
  - Rejeição sem autenticação
  - Rejeição com itinerary de outro usuário
"""

import pytest
from conftest import SUPABASE_URL, auth_headers

pytestmark = pytest.mark.asyncio

EDGE_URL_CONSULTANT = f"{SUPABASE_URL}/functions/v1/send-to-consultant"
EDGE_URL_GENERATE = f"{SUPABASE_URL}/functions/v1/generate-itinerary"


async def setup_generated_itinerary(client, token, user_id):
    """Cria itinerary completo e gera o roteiro."""
    resp = await client.post(
        f"{SUPABASE_URL}/rest/v1/itineraries",
        headers={**auth_headers(token), "Prefer": "return=representation"},
        json={"user_id": user_id},
    )
    itin_id = resp.json()[0]["id"]

    await client.post(
        f"{SUPABASE_URL}/rest/v1/itinerary_answers",
        headers={**auth_headers(token), "Prefer": "return=representation"},
        json={
            "itinerary_id": itin_id,
            "nome": "Teste Envio",
            "whatsapp": "(11) 99999-0000",
            "email": "teste@send.com",
            "perfil": "casal",
            "adultos": 2,
            "criancas": 0,
            "datas_definidas": True,
            "data_ida": "01/07/2026",
            "data_volta": "05/07/2026",
            "cidades": {"mvd": 4},
            "hotel_estrelas": "4",
            "hotel_opcao": "Quero sugestoes de hoteis",
            "passeios": ["city_mvd"],
            "ocasiao_especial": "Nao, e uma viagem normal",
            "orcamento": "R$ 3.500 a R$ 5.000 por pessoa",
            "current_step": 10,
        },
    )

    # Gerar roteiro
    await client.post(
        EDGE_URL_GENERATE,
        headers=auth_headers(token),
        json={"itinerary_id": itin_id},
        timeout=60,
    )
    return itin_id


class TestSendToConsultant:
    async def test_send_success(self, http_client, authed_user):
        """Deve enviar para consultora com sucesso."""
        itin_id = await setup_generated_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.post(
            EDGE_URL_CONSULTANT,
            headers=auth_headers(authed_user["token"]),
            json={"itinerary_id": itin_id},
            timeout=30,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data
        assert len(data["message"]) > 10

    async def test_status_updated_to_sent(self, http_client, authed_user):
        """Status deve mudar para 'sent_to_consultant'."""
        itin_id = await setup_generated_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        await http_client.post(
            EDGE_URL_CONSULTANT,
            headers=auth_headers(authed_user["token"]),
            json={"itinerary_id": itin_id},
            timeout=30,
        )

        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}&select=status,consultant_response,sent_at",
            headers=auth_headers(authed_user["token"]),
        )
        itin = resp.json()[0]
        assert itin["status"] == "sent_to_consultant"
        assert itin["consultant_response"] is not None
        assert itin["sent_at"] is not None

    async def test_reject_draft_itinerary(self, http_client, authed_user):
        """Deve rejeitar envio de itinerary ainda em draft."""
        resp = await http_client.post(
            f"{SUPABASE_URL}/rest/v1/itineraries",
            headers={**auth_headers(authed_user["token"]), "Prefer": "return=representation"},
            json={"user_id": authed_user["user_id"]},
        )
        itin_id = resp.json()[0]["id"]

        resp = await http_client.post(
            EDGE_URL_CONSULTANT,
            headers=auth_headers(authed_user["token"]),
            json={"itinerary_id": itin_id},
        )
        assert resp.status_code in (400, 422)


class TestConsultantAuth:
    async def test_reject_without_auth(self, http_client):
        """Deve rejeitar chamada sem autenticação."""
        resp = await http_client.post(
            EDGE_URL_CONSULTANT,
            headers={"Content-Type": "application/json"},
            json={"itinerary_id": "fake"},
        )
        assert resp.status_code in (401, 403)

    async def test_reject_other_user_itinerary(
        self, http_client, authed_user, second_user
    ):
        """Deve rejeitar envio de itinerary de outro usuário."""
        itin_id = await setup_generated_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.post(
            EDGE_URL_CONSULTANT,
            headers=auth_headers(second_user["token"]),
            json={"itinerary_id": itin_id},
        )
        assert resp.status_code in (403, 404)
