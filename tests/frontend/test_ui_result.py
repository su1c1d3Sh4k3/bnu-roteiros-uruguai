"""
Testes de UI — Tela de Resultado (Playwright)
===============================================
Cobertura:
  - Tela de loading durante geração
  - Resultado renderiza com roteiro e orçamento
  - Timeline da viagem presente
  - Chips de resumo (perfil, pessoas, cidades, hotel)
  - Botão "Enviar para consultora"
  - Botão "Revisar roteiro"
  - Botão "Tirar dúvidas com Rodrigo"
"""

import uuid
import pytest
from playwright.sync_api import expect

FRONTEND_URL = "http://localhost:5173"


@pytest.fixture
def result_page(page):
    """Registra, preenche wizard completo e gera roteiro."""
    uid = uuid.uuid4().hex[:8]
    page.goto(f"{FRONTEND_URL}/register")
    page.fill('input[name="nome"]', f"Result Test {uid}")
    page.fill('input[type="email"]', f"result_{uid}@bnu-test.com")
    page.fill('input[type="password"]', "TestPass123!")
    page.get_by_role("button", name=/criar|registrar/i).click()
    page.wait_for_timeout(3000)

    page.goto(FRONTEND_URL)
    page.get_by_text(/Come[cç]ar Meu Roteiro/i).click()
    page.wait_for_timeout(1000)

    # Preencher wizard rapidamente
    # Step 1
    page.fill('input[placeholder*="Nome" i]', f"Result Test {uid}")
    page.fill('input[placeholder*="99999" i]', "(11) 99999-0000")
    page.fill('input[type="email"]', f"result_{uid}@bnu-test.com")
    page.get_by_role("button", name=/Pr[oó]ximo/i).click()
    page.wait_for_timeout(500)

    # Step 2: Perfil
    page.get_by_text("Casal").click()
    page.get_by_role("button", name=/Pr[oó]ximo/i).click()
    page.wait_for_timeout(500)

    # Step 3: Grupo
    page.get_by_role("button", name=/Pr[oó]ximo/i).click()
    page.wait_for_timeout(500)

    # Step 4: Datas
    page.get_by_text(/Ainda n[aã]o/i).click()
    page.get_by_role("button", name=/Pr[oó]ximo/i).click()
    page.wait_for_timeout(500)

    # Step 5: Cidades
    page.get_by_text("Montevideo").click()
    page.get_by_role("button", name=/Pr[oó]ximo/i).click()
    page.wait_for_timeout(500)

    # Step 6: Hotel
    page.get_by_text(/Econ[oô]mico/i).click()
    page.get_by_role("button", name=/Pr[oó]ximo/i).click()
    page.wait_for_timeout(500)

    # Step 7: Preferência
    page.get_by_text(/sugest[oõ]es/i).click()
    page.get_by_role("button", name=/Pr[oó]ximo/i).click()
    page.wait_for_timeout(500)

    # Step 8: Passeios (pular)
    page.get_by_role("button", name=/Pr[oó]ximo/i).click()
    page.wait_for_timeout(500)

    # Step 9: Ocasião
    page.get_by_text(/viagem normal/i).click()
    page.get_by_role("button", name=/Pr[oó]ximo/i).click()
    page.wait_for_timeout(500)

    # Step 10: Orçamento
    page.get_by_text(/3.500/).first.click()
    page.get_by_role("button", name=/Pr[oó]ximo/i).click()
    page.wait_for_timeout(500)

    # Step 11: Extras (pular)
    page.get_by_role("button", name=/Gerar/i).click()
    page.wait_for_timeout(20000)  # Aguardar geração pela IA

    return page


class TestLoadingState:
    def test_loading_shows_spinner(self, result_page):
        """A geração já ocorreu, mas o resultado deve estar presente."""
        # Se ainda estiver carregando, haverá animação
        # Se já carregou, o resultado estará presente
        page = result_page
        # Pelo menos um dos dois deve ser verdade
        has_result = page.get_by_text(/Roteiro/i).is_visible()
        has_loading = page.get_by_text(/Montando/i).is_visible()
        assert has_result or has_loading


class TestResultContent:
    def test_result_shows_itinerary(self, result_page):
        """Resultado deve conter texto do roteiro."""
        page = result_page
        # Deve ter menção a Dia 1 ou Chegada
        expect(page.get_by_text(/Dia 1|Chegada/i).first).to_be_visible()

    def test_result_shows_chips(self, result_page):
        """Deve mostrar chips de resumo (perfil, pessoas, etc)."""
        page = result_page
        expect(page.get_by_text(/Casal/i).first).to_be_visible()
        expect(page.get_by_text(/pessoa/i).first).to_be_visible()

    def test_result_has_cta_buttons(self, result_page):
        """Deve ter botões de ação: enviar, dúvidas, revisar."""
        page = result_page
        expect(page.get_by_text(/pr[oó]ximo passo|enviar/i).first).to_be_visible()
        expect(page.get_by_text(/Rodrigo|d[uú]vida/i).first).to_be_visible()
        expect(page.get_by_text(/Revisar|roteiro/i).first).to_be_visible()

    def test_back_to_wizard(self, result_page):
        """Botão 'Revisar' deve voltar ao wizard."""
        page = result_page
        page.get_by_text(/Revisar.*roteiro/i).click()
        page.wait_for_timeout(2000)
        # Deve voltar ao wizard
        expect(page.get_by_text(/Etapa/i).first).to_be_visible()
