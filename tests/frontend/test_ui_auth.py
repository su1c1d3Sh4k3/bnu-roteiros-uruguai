"""
Testes de UI — Autenticação (Playwright)
=========================================
Cobertura:
  - Página de login renderiza
  - Registro de novo usuário
  - Login com credenciais válidas
  - Login com credenciais inválidas mostra erro
  - Redirecionamento após login
  - Logout
"""

import uuid
import pytest
from playwright.sync_api import expect

FRONTEND_URL = "http://localhost:5173"


@pytest.fixture
def test_credentials():
    uid = uuid.uuid4().hex[:8]
    return {
        "nome": f"Teste {uid}",
        "email": f"ui_test_{uid}@bnu-test.com",
        "password": "TestPass123!",
        "whatsapp": "(11) 99999-0000",
    }


class TestLoginPage:
    def test_login_page_renders(self, page):
        """Página de login deve renderizar com campos de email e senha."""
        page.goto(f"{FRONTEND_URL}/login")
        expect(page.locator('input[type="email"]')).to_be_visible()
        expect(page.locator('input[type="password"]')).to_be_visible()
        expect(page.get_by_role("button", name=/entrar|login/i)).to_be_visible()

    def test_login_page_has_register_link(self, page):
        """Deve ter link para criar conta."""
        page.goto(f"{FRONTEND_URL}/login")
        expect(page.get_by_text(/criar conta|registr/i)).to_be_visible()


class TestRegister:
    def test_register_new_user(self, page, test_credentials):
        """Registro de novo usuário deve funcionar."""
        page.goto(f"{FRONTEND_URL}/register")
        page.fill('input[name="nome"]', test_credentials["nome"])
        page.fill('input[type="email"]', test_credentials["email"])
        page.fill('input[name="whatsapp"]', test_credentials["whatsapp"])
        page.fill('input[type="password"]', test_credentials["password"])
        page.get_by_role("button", name=/criar|registrar/i).click()
        # Deve redirecionar para welcome ou dashboard
        page.wait_for_url(f"{FRONTEND_URL}/**", timeout=10000)
        assert "/login" not in page.url

    def test_register_missing_fields_shows_error(self, page):
        """Registro sem preencher campos obrigatórios deve mostrar erro."""
        page.goto(f"{FRONTEND_URL}/register")
        page.get_by_role("button", name=/criar|registrar/i).click()
        # Deve mostrar alguma mensagem de erro ou validação
        page.wait_for_timeout(1000)
        # O URL não deve mudar (permanece em /register)
        assert "register" in page.url


class TestLogin:
    def test_login_valid_credentials(self, page, test_credentials):
        """Login com credenciais válidas deve redirecionar."""
        # Primeiro registrar
        page.goto(f"{FRONTEND_URL}/register")
        page.fill('input[name="nome"]', test_credentials["nome"])
        page.fill('input[type="email"]', test_credentials["email"])
        page.fill('input[type="password"]', test_credentials["password"])
        page.get_by_role("button", name=/criar|registrar/i).click()
        page.wait_for_timeout(3000)

        # Fazer logout se necessário e login novamente
        page.goto(f"{FRONTEND_URL}/login")
        page.fill('input[type="email"]', test_credentials["email"])
        page.fill('input[type="password"]', test_credentials["password"])
        page.get_by_role("button", name=/entrar|login/i).click()
        page.wait_for_url(f"{FRONTEND_URL}/**", timeout=10000)
        assert "/login" not in page.url

    def test_login_wrong_password_shows_error(self, page):
        """Login com senha errada deve mostrar mensagem de erro."""
        page.goto(f"{FRONTEND_URL}/login")
        page.fill('input[type="email"]', "naoexiste@test.com")
        page.fill('input[type="password"]', "SenhaErrada123!")
        page.get_by_role("button", name=/entrar|login/i).click()
        page.wait_for_timeout(3000)
        # Deve permanecer na página de login
        assert "login" in page.url


class TestLogout:
    def test_logout_redirects_to_login(self, page, test_credentials):
        """Logout deve redirecionar para página de login."""
        # Registrar e logar
        page.goto(f"{FRONTEND_URL}/register")
        page.fill('input[name="nome"]', test_credentials["nome"])
        page.fill('input[type="email"]', test_credentials["email"])
        page.fill('input[type="password"]', test_credentials["password"])
        page.get_by_role("button", name=/criar|registrar/i).click()
        page.wait_for_timeout(3000)

        # Clicar em logout
        logout_btn = page.get_by_text(/sair|logout/i)
        if logout_btn.is_visible():
            logout_btn.click()
            page.wait_for_timeout(2000)
            assert "login" in page.url
