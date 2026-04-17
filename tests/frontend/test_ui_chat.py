"""
Testes de UI — Chat com Rodrigo (Playwright)
=============================================
Cobertura:
  - Botão de chat visível durante o wizard
  - Abrir e fechar painel de chat
  - Enviar mensagem
  - Receber resposta (loading indicator)
  - Mensagem de boas-vindas presente
"""

import uuid
import pytest
from playwright.sync_api import expect

FRONTEND_URL = "http://localhost:5173"


@pytest.fixture
def wizard_page(page):
    """Registra, loga e navega até o wizard step 1."""
    uid = uuid.uuid4().hex[:8]
    page.goto(f"{FRONTEND_URL}/register")
    page.fill('input[name="nome"]', f"Chat Test {uid}")
    page.fill('input[type="email"]', f"chat_{uid}@bnu-test.com")
    page.fill('input[type="password"]', "TestPass123!")
    page.get_by_role("button", name=/criar|registrar/i).click()
    page.wait_for_timeout(3000)
    page.goto(FRONTEND_URL)
    page.get_by_text(/Come[cç]ar Meu Roteiro/i).click()
    page.wait_for_timeout(2000)
    return page


class TestChatButton:
    def test_chat_button_visible(self, wizard_page):
        """Botão de chat (💬) deve estar visível no wizard."""
        page = wizard_page
        chat_btn = page.locator("button").filter(has_text="💬")
        expect(chat_btn).to_be_visible()

    def test_open_chat_panel(self, wizard_page):
        """Clicar no botão deve abrir o painel de chat."""
        page = wizard_page
        page.locator("button").filter(has_text="💬").click()
        page.wait_for_timeout(500)
        # Painel deve mostrar "Rodrigo"
        expect(page.get_by_text("Rodrigo")).to_be_visible()

    def test_close_chat_panel(self, wizard_page):
        """Clicar em × deve fechar o painel."""
        page = wizard_page
        page.locator("button").filter(has_text="💬").click()
        page.wait_for_timeout(500)
        # Fechar
        page.locator("button").filter(has_text="×").click()
        page.wait_for_timeout(500)
        # Botão 💬 deve reaparecer
        expect(page.locator("button").filter(has_text="💬")).to_be_visible()


class TestChatInteraction:
    def test_welcome_message_present(self, wizard_page):
        """Chat deve ter mensagem de boas-vindas do Rodrigo."""
        page = wizard_page
        page.locator("button").filter(has_text="💬").click()
        page.wait_for_timeout(500)
        expect(page.get_by_text(/Rodrigo/i)).to_be_visible()
        expect(page.get_by_text(/Brasileiros no Uruguai/i)).to_be_visible()

    def test_send_message(self, wizard_page):
        """Deve permitir enviar mensagem via textarea."""
        page = wizard_page
        page.locator("button").filter(has_text="💬").click()
        page.wait_for_timeout(500)

        # Digitar mensagem
        textarea = page.locator("textarea[placeholder*='Uruguai' i]")
        textarea.fill("Quanto custa o City Tour?")
        textarea.press("Enter")

        # Deve aparecer a mensagem enviada
        page.wait_for_timeout(1000)
        expect(page.get_by_text("Quanto custa o City Tour?")).to_be_visible()

    def test_receive_response(self, wizard_page):
        """Deve receber resposta do assistente após enviar mensagem."""
        page = wizard_page
        page.locator("button").filter(has_text="💬").click()
        page.wait_for_timeout(500)

        textarea = page.locator("textarea[placeholder*='Uruguai' i]")
        textarea.fill("Quais passeios vocês oferecem?")
        textarea.press("Enter")

        # Aguardar resposta (timeout maior por causa da IA)
        page.wait_for_timeout(15000)

        # Deve ter mais de 2 mensagens (boas-vindas + user + assistant)
        messages = page.locator("[style*='borderRadius']").filter(
            has=page.locator("text=/./")
        )
        assert messages.count() >= 3
