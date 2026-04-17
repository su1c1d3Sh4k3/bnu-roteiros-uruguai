"""
Testes de Itinerary Answers — CRUD do wizard
=============================================
Cobertura:
  - Criar answers vinculadas a itinerary
  - Atualizar answers (simular progressão do wizard)
  - Ler answers
  - RLS: não acessar answers de outro usuário
  - Cascade delete: deletar itinerary remove answers
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


async def create_answers(client, token, itinerary_id, data=None):
    payload = {"itinerary_id": itinerary_id}
    if data:
        payload.update(data)
    resp = await client.post(
        f"{SUPABASE_URL}/rest/v1/itinerary_answers",
        headers={**auth_headers(token), "Prefer": "return=representation"},
        json=payload,
    )
    assert resp.status_code == 201
    return resp.json()[0]["id"]


class TestCreateAnswers:
    async def test_create_answers_for_itinerary(self, http_client, authed_user):
        """Deve criar answers vinculadas a um itinerary."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        ans_id = await create_answers(http_client, authed_user["token"], itin_id)
        assert ans_id

    async def test_default_values(self, http_client, authed_user):
        """Answers devem ter valores padrão corretos."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        await create_answers(http_client, authed_user["token"], itin_id)
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itinerary_answers?itinerary_id=eq.{itin_id}&select=*",
            headers=auth_headers(authed_user["token"]),
        )
        ans = resp.json()[0]
        assert ans["adultos"] == 1
        assert ans["criancas"] == 0
        assert ans["current_step"] == 0
        assert ans["cidades"] == {}
        assert ans["passeios"] == []

    async def test_unique_constraint(self, http_client, authed_user):
        """Não deve permitir duas answers para o mesmo itinerary."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        await create_answers(http_client, authed_user["token"], itin_id)
        resp = await http_client.post(
            f"{SUPABASE_URL}/rest/v1/itinerary_answers",
            headers={**auth_headers(authed_user["token"]), "Prefer": "return=representation"},
            json={"itinerary_id": itin_id},
        )
        assert resp.status_code == 409  # Conflict


class TestUpdateAnswers:
    async def test_update_step1_contact(self, http_client, authed_user):
        """Deve atualizar dados de contato (step 1)."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        ans_id = await create_answers(http_client, authed_user["token"], itin_id)
        resp = await http_client.patch(
            f"{SUPABASE_URL}/rest/v1/itinerary_answers?id=eq.{ans_id}",
            headers={**auth_headers(authed_user["token"]), "Prefer": "return=representation"},
            json={
                "nome": "Ana Lima",
                "whatsapp": "(11) 99999-9999",
                "email": "ana@test.com",
                "current_step": 1,
            },
        )
        assert resp.status_code == 200
        updated = resp.json()[0]
        assert updated["nome"] == "Ana Lima"
        assert updated["current_step"] == 1

    async def test_update_step5_cidades(self, http_client, authed_user):
        """Deve atualizar cidades com JSONB."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        ans_id = await create_answers(http_client, authed_user["token"], itin_id)
        resp = await http_client.patch(
            f"{SUPABASE_URL}/rest/v1/itinerary_answers?id=eq.{ans_id}",
            headers={**auth_headers(authed_user["token"]), "Prefer": "return=representation"},
            json={
                "cidades": {"mvd": 3, "pde": 2},
                "current_step": 5,
            },
        )
        assert resp.status_code == 200
        assert resp.json()[0]["cidades"] == {"mvd": 3, "pde": 2}

    async def test_update_step8_passeios(self, http_client, authed_user):
        """Deve atualizar array de passeios."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        ans_id = await create_answers(http_client, authed_user["token"], itin_id)
        resp = await http_client.patch(
            f"{SUPABASE_URL}/rest/v1/itinerary_answers?id=eq.{ans_id}",
            headers={**auth_headers(authed_user["token"]), "Prefer": "return=representation"},
            json={
                "passeios": ["city_mvd", "bouza", "primuseum"],
                "current_step": 8,
            },
        )
        assert resp.status_code == 200
        assert "city_mvd" in resp.json()[0]["passeios"]

    async def test_full_wizard_completion(self, http_client, authed_user):
        """Deve permitir preencher todos os campos do wizard."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        ans_id = await create_answers(http_client, authed_user["token"], itin_id)
        full_data = {
            "nome": "Carlos Silva",
            "whatsapp": "(21) 98888-7777",
            "email": "carlos@test.com",
            "perfil": "casal",
            "adultos": 2,
            "criancas": 0,
            "datas_definidas": True,
            "data_ida": "15/05/2026",
            "data_volta": "20/05/2026",
            "cidades": {"mvd": 3, "pde": 2},
            "hotel_estrelas": "4",
            "hotel_opcao": "Quero sugestoes de hoteis",
            "passeios": ["city_mvd", "city_pde", "bouza"],
            "ocasiao_especial": "Nao, e uma viagem normal",
            "orcamento": "R$ 5.000 a R$ 8.000 por pessoa",
            "extras": "Preferimos restaurantes com vista pro mar",
            "current_step": 10,
        }
        resp = await http_client.patch(
            f"{SUPABASE_URL}/rest/v1/itinerary_answers?id=eq.{ans_id}",
            headers={**auth_headers(authed_user["token"]), "Prefer": "return=representation"},
            json=full_data,
        )
        assert resp.status_code == 200
        updated = resp.json()[0]
        assert updated["perfil"] == "casal"
        assert updated["adultos"] == 2
        assert updated["cidades"] == {"mvd": 3, "pde": 2}


class TestRLSAnswers:
    async def test_cannot_read_other_user_answers(
        self, http_client, authed_user, second_user
    ):
        """Usuário não deve ver answers de outro usuário."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        await create_answers(
            http_client,
            authed_user["token"],
            itin_id,
            {"nome": "Segredo"},
        )
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itinerary_answers?itinerary_id=eq.{itin_id}&select=*",
            headers=auth_headers(second_user["token"]),
        )
        assert resp.json() == []


class TestCascadeDelete:
    async def test_delete_itinerary_removes_answers(self, http_client, authed_user):
        """Deletar itinerary deve remover answers em cascata."""
        itin_id = await create_itinerary(
            http_client, authed_user["token"], authed_user["user_id"]
        )
        ans_id = await create_answers(http_client, authed_user["token"], itin_id)

        # Deletar itinerary
        await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/itineraries?id=eq.{itin_id}",
            headers=auth_headers(authed_user["token"]),
        )

        # Answers devem ter sido removidas
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/itinerary_answers?id=eq.{ans_id}&select=id",
            headers=auth_headers(authed_user["token"]),
        )
        assert resp.json() == []
