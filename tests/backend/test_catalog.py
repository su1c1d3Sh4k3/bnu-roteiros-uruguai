"""
Testes de Catálogo — Leitura de dados de referência
=====================================================
Cobertura:
  - Leitura de cities
  - Leitura de tours (ativos)
  - Leitura de hotel_styles
  - Leitura de travel_profiles
  - Leitura de budget_ranges
  - Ordenação por sort_order
  - Quantidade de registros esperada (seed)
"""

import pytest
from conftest import SUPABASE_URL, auth_headers

pytestmark = pytest.mark.asyncio


class TestCities:
    async def test_list_cities(self, http_client, authed_user):
        """Deve retornar todas as 6 cidades do seed."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/cities?select=*&order=sort_order",
            headers=auth_headers(authed_user["token"]),
        )
        assert resp.status_code == 200
        cities = resp.json()
        assert len(cities) == 6

    async def test_cities_have_required_fields(self, http_client, authed_user):
        """Cada cidade deve ter id, nome, emoji."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/cities?select=*&order=sort_order",
            headers=auth_headers(authed_user["token"]),
        )
        for city in resp.json():
            assert city["id"]
            assert city["nome"]
            assert city["emoji"]

    async def test_montevideo_is_first(self, http_client, authed_user):
        """Montevideo deve ser a primeira cidade (sort_order=1)."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/cities?select=*&order=sort_order&limit=1",
            headers=auth_headers(authed_user["token"]),
        )
        assert resp.json()[0]["id"] == "mvd"


class TestTours:
    async def test_list_tours(self, http_client, authed_user):
        """Deve retornar todos os 8 passeios do seed."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/tours?select=*&ativo=eq.true&order=sort_order",
            headers=auth_headers(authed_user["token"]),
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 8

    async def test_tour_has_price(self, http_client, authed_user):
        """Cada passeio deve ter valor_por_pessoa > 0."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/tours?select=*&ativo=eq.true",
            headers=auth_headers(authed_user["token"]),
        )
        for tour in resp.json():
            assert float(tour["valor_por_pessoa"]) > 0

    async def test_city_tour_mvd_price(self, http_client, authed_user):
        """City Tour Montevideo deve custar R$129."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/tours?id=eq.city_mvd&select=valor_por_pessoa",
            headers=auth_headers(authed_user["token"]),
        )
        assert float(resp.json()[0]["valor_por_pessoa"]) == 129.00

    async def test_tour_references_valid_city(self, http_client, authed_user):
        """Cada tour deve referenciar uma cidade existente."""
        resp_tours = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/tours?select=cidade_base",
            headers=auth_headers(authed_user["token"]),
        )
        resp_cities = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/cities?select=id",
            headers=auth_headers(authed_user["token"]),
        )
        city_ids = {c["id"] for c in resp_cities.json()}
        for tour in resp_tours.json():
            if tour["cidade_base"]:
                assert tour["cidade_base"] in city_ids


class TestHotelStyles:
    async def test_list_hotel_styles(self, http_client, authed_user):
        """Deve retornar 3 estilos de hotel."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/hotel_styles?select=*&order=sort_order",
            headers=auth_headers(authed_user["token"]),
        )
        assert len(resp.json()) == 3

    async def test_styles_ordered(self, http_client, authed_user):
        """Estilos devem vir em ordem: 3, 4, 5."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/hotel_styles?select=id&order=sort_order",
            headers=auth_headers(authed_user["token"]),
        )
        ids = [h["id"] for h in resp.json()]
        assert ids == ["3", "4", "5"]


class TestTravelProfiles:
    async def test_list_profiles(self, http_client, authed_user):
        """Deve retornar 6 perfis de viagem."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/travel_profiles?select=*&order=sort_order",
            headers=auth_headers(authed_user["token"]),
        )
        assert len(resp.json()) == 6


class TestBudgetRanges:
    async def test_list_budgets(self, http_client, authed_user):
        """Deve retornar 5 faixas de orçamento."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/budget_ranges?select=*&order=sort_order",
            headers=auth_headers(authed_user["token"]),
        )
        assert len(resp.json()) == 5

    async def test_budget_ranges_ordered(self, http_client, authed_user):
        """Faixas devem estar em ordem crescente de valor."""
        resp = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/budget_ranges?select=*&order=sort_order",
            headers=auth_headers(authed_user["token"]),
        )
        ranges = resp.json()
        for i in range(len(ranges) - 1):
            if ranges[i]["min_value"] is not None and ranges[i + 1]["min_value"] is not None:
                assert float(ranges[i]["min_value"]) <= float(ranges[i + 1]["min_value"])
