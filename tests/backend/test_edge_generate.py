"""
Testes da Edge Function: generate-itinerary
============================================
Cobertura:
  - Geração com dados completos
  - Rejeição sem autenticação
  - Rejeição com itinerary_id inexistente
  - Rejeição com itinerary de outro usuário
  - Resultado salvo no banco
  - Status atualizado para 'generated'
"""

import pytest
from conftest import SUPABASE_URL, auth_headers, anon_headers

pytestmark = pytest.mark.asyncio

EDGE_URL_GENERATE = f"{SUPABASE_URL}/functions/v1/generate-itinerary"


async def setup_full_itinerary(client, token, user_id):
    """Cria itinerary + answers completos para gerar roteiro."""
    # Criar itinerary
    resp = await client.post(
        f"{SUPABASE_URL}/rest/v1/itineraries",
        headers={**auth_headers(token), "Prefer": "return=representation"},
        json={"user_id": user_id},
    )
    itin_id = resp.json()[0]["id"]

    # Criar answers completos
    await client.post(
        f"{SUPABASE_URL}/rest/v1/itinerary_answers",
        headers={**auth_headers(token), "Prefer": "return=representation"},
        json={
            "itinerary_id": itin_id,
            "nome": "Teste Geração",
            "whatsapp": "(11) 99999-0000",
            "email": "teste@gen.com",
            "perfil": "casal",
            "adultos": 2,
            "criancas": 0,
            "datas_definidas": True,
            "data_ida": "01/06/2026",
            "data_volta": "06/06/2026",
            "cidades": {"mvd": 3, "pde": 2},
            "hotel_estrelas": "4",
            "hotel_opcao": "Quero sugestoes de hoteis",
            "passeios": ["city_mvd", "bouza"],
            "ocasiao_especial": "Nao, e uma viagem normal",
            "orcamento": "R$ 5.000 a R$ 8.000 por pessoa",
            "extras": "",
            "current_step": 10,
        },
    )
    return itin_id


class TestGenerateItinerary:
    async def test_generate_success(self, http_client, authed_user):
        """Deve gerar roteiro com sucesso para dados completos."""
        itin_id = await setup_full_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.post(
            EDGE_URL_GENERATE,
            headers=auth_headers(authed_user["token"]),
            json={"itinerary_id": itin_id},
            timeout=60,  # IA pode demorar
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "result" in data
        assert len(data["result"]) > 100  # Roteiro deve ter conteúdo substancial

    async def test_status_updated_to_generated(self, http_client, authed_user):
        """Após gerar, status deve ser 'generated'."""
        itin_id = await setup_full_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        await http_client.post(
            EDGE_URL_GENERATE,
            headers=auth_headers(authed_user["token"]),
            json={"itinerary_id": itin_id},
            timeout=60,
        )
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}&select=status,generated_result",
            headers=auth_headers(authed_user["token"]),
        )
        itin = resp.json()[0]
        assert itin["status"] == "generated"
        assert itin["generated_result"] is not None

    async def test_result_saved_in_db(self, http_client, authed_user):
        """O resultado gerado deve estar salvo em itineraries.generated_result."""
        itin_id = await setup_full_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        gen_resp = await http_client.post(
            EDGE_URL_GENERATE,
            headers=auth_headers(authed_user["token"]),
            json={"itinerary_id": itin_id},
            timeout=60,
        )
        result_text = gen_resp.json()["result"]

        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}&select=generated_result",
            headers=auth_headers(authed_user["token"]),
        )
        assert resp.json()[0]["generated_result"] == result_text


class TestGenerateAuth:
    async def test_reject_without_auth(self, http_client):
        """Deve rejeitar chamada sem token de autenticação."""
        resp = await http_client.post(
            EDGE_URL_GENERATE,
            headers={"Content-Type": "application/json", "apikey": ""},
            json={"itinerary_id": "fake-id"},
        )
        assert resp.status_code in (401, 403)

    async def test_reject_other_user_itinerary(
        self, http_client, authed_user, second_user
    ):
        """Deve rejeitar geração de roteiro de outro usuário."""
        itin_id = await setup_full_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        resp = await http_client.post(
            EDGE_URL_GENERATE,
            headers=auth_headers(second_user["token"]),
            json={"itinerary_id": itin_id},
        )
        assert resp.status_code in (403, 404)

    async def test_reject_nonexistent_itinerary(self, http_client, authed_user):
        """Deve rejeitar itinerary_id inexistente."""
        resp = await http_client.post(
            EDGE_URL_GENERATE,
            headers=auth_headers(authed_user["token"]),
            json={"itinerary_id": "00000000-0000-0000-0000-000000000000"},
        )
        assert resp.status_code in (404, 400)
