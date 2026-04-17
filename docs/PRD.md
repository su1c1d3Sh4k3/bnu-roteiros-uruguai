# PRD — Sistema de Roteiros Uruguai (BNU)

## Product Requirements Document — v1.0

**Projeto:** Planejador de Roteiros BNU (Brasileiros no Uruguai)
**Data:** 2026-04-13
**Stack:** React (Vite) + Supabase (Auth, Database, Edge Functions) + Claude API
**Versão base:** `1775830795105_sistema-roteiros-10.04.26-v2.jsx`

---

## 1. Visão Geral

Sistema web completo para a agência **Brasileiros no Uruguai (BNU)** que permite clientes criarem roteiros personalizados para o Uruguai com auxílio de IA. O sistema atual é um único arquivo JSX sem backend — esta versão adiciona autenticação, persistência, backend seguro e testes automatizados.

### 1.1 Objetivos

| # | Objetivo | Métrica |
|---|----------|---------|
| 1 | Autenticação de clientes | Login/registro com email+senha via Supabase Auth |
| 2 | Persistência de dados | Roteiros salvos no banco, recuperáveis entre sessões |
| 3 | Segurança da API Key | Chamadas à Claude API via Edge Functions (chave nunca exposta no frontend) |
| 4 | Histórico de roteiros | Cliente pode ver e gerenciar roteiros anteriores |
| 5 | Chat persistente | Histórico de conversas com Rodrigo salvo por roteiro |
| 6 | Testabilidade completa | Suite de testes Python cobrindo front e back |

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (React + Vite)            │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  Auth     │  │  Wizard   │  │  Result   │          │
│  │  Pages    │  │  Screen   │  │  Screen   │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │              │              │                 │
│       └──────────────┴──────────────┘                │
│                      │                                │
│              Supabase Client JS                      │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                   SUPABASE                           │
│                                                      │
│  ┌─────────────┐  ┌──────────────────────────┐      │
│  │  Auth        │  │  PostgreSQL Database      │      │
│  │  (email/pwd) │  │                          │      │
│  └─────────────┘  │  profiles                 │      │
│                    │  itineraries              │      │
│  ┌─────────────┐  │  itinerary_answers        │      │
│  │ Edge Funcs   │  │  chat_messages            │      │
│  │              │  │  tours                    │      │
│  │ /generate    │  │  cities                   │      │
│  │ /chat        │  │  hotel_styles             │      │
│  │ /consultant  │  │  budget_ranges            │      │
│  └──────┬──────┘  │  travel_profiles           │      │
│         │         └──────────────────────────┘      │
│         ▼                                            │
│  ┌─────────────┐                                    │
│  │ Claude API   │                                    │
│  │ (Anthropic)  │                                    │
│  └─────────────┘                                    │
└─────────────────────────────────────────────────────┘
```

---

## 3. Modelo de Dados (PostgreSQL via Supabase)

### 3.1 Tabela `profiles`

Extensão do `auth.users`. Criada automaticamente via trigger no signup.

| Coluna | Tipo | Constraint | Descrição |
|--------|------|-----------|-----------|
| id | uuid | PK, FK → auth.users.id | ID do usuário |
| nome | text | NOT NULL | Nome completo |
| whatsapp | text | | Telefone WhatsApp |
| email | text | NOT NULL | Email (espelhado de auth) |
| created_at | timestamptz | DEFAULT now() | Data de criação |
| updated_at | timestamptz | DEFAULT now() | Última atualização |

### 3.2 Tabela `cities`

Catálogo de cidades disponíveis.

| Coluna | Tipo | Constraint | Descrição |
|--------|------|-----------|-----------|
| id | text | PK | Código da cidade (mvd, pde, col...) |
| nome | text | NOT NULL | Nome completo |
| emoji | text | | Emoji representativo |
| description | text | | Descrição curta |
| sort_order | int | DEFAULT 0 | Ordem de exibição |

### 3.3 Tabela `tours`

Catálogo de passeios regulares.

| Coluna | Tipo | Constraint | Descrição |
|--------|------|-----------|-----------|
| id | text | PK | Código do passeio |
| nome | text | NOT NULL | Nome do passeio |
| valor_por_pessoa | numeric(10,2) | NOT NULL | Preço em R$ por pessoa |
| emoji | text | | Emoji representativo |
| description | text | | Descrição curta |
| dias_min | int | DEFAULT 1 | Dias mínimos para encaixar |
| cidade_base | text | FK → cities.id | Cidade de partida |
| image_url | text | | URL da imagem |
| ativo | boolean | DEFAULT true | Se está ativo no catálogo |

### 3.4 Tabela `hotel_styles`

Estilos de hospedagem.

| Coluna | Tipo | Constraint | Descrição |
|--------|------|-----------|-----------|
| id | text | PK | Código (3, 4, 5) |
| label | text | NOT NULL | Nome do estilo |
| description | text | | Descrição |
| emoji | text | | Emoji |
| stars | text | | Representação visual |
| sort_order | int | DEFAULT 0 | Ordem de exibição |

### 3.5 Tabela `travel_profiles`

Perfis de viagem.

| Coluna | Tipo | Constraint | Descrição |
|--------|------|-----------|-----------|
| id | text | PK | Código (casal, familia...) |
| label | text | NOT NULL | Label de exibição |
| emoji | text | | Emoji |
| sort_order | int | DEFAULT 0 | Ordem de exibição |

### 3.6 Tabela `budget_ranges`

Faixas de orçamento.

| Coluna | Tipo | Constraint | Descrição |
|--------|------|-----------|-----------|
| id | text | PK | Código (ate3500, 3500_5k...) |
| label | text | NOT NULL | Label de exibição |
| min_value | numeric(10,2) | | Valor mínimo |
| max_value | numeric(10,2) | | Valor máximo (null = sem limite) |
| sort_order | int | DEFAULT 0 | Ordem de exibição |

### 3.7 Tabela `itineraries`

Roteiros criados pelos clientes.

| Coluna | Tipo | Constraint | Descrição |
|--------|------|-----------|-----------|
| id | uuid | PK, DEFAULT gen_random_uuid() | ID do roteiro |
| user_id | uuid | NOT NULL, FK → auth.users.id | Dono do roteiro |
| status | text | DEFAULT 'draft' | draft, generated, sent_to_consultant |
| generated_result | text | | Texto do roteiro gerado pela IA |
| consultant_response | text | | Resposta da IA ao enviar para consultora |
| sent_at | timestamptz | | Data/hora de envio para consultora |
| created_at | timestamptz | DEFAULT now() | Data de criação |
| updated_at | timestamptz | DEFAULT now() | Última atualização |

### 3.8 Tabela `itinerary_answers`

Respostas do wizard, 1:1 com itinerary.

| Coluna | Tipo | Constraint | Descrição |
|--------|------|-----------|-----------|
| id | uuid | PK, DEFAULT gen_random_uuid() | ID |
| itinerary_id | uuid | NOT NULL, UNIQUE, FK → itineraries.id ON DELETE CASCADE | Roteiro associado |
| nome | text | | Nome do viajante |
| whatsapp | text | | WhatsApp |
| email | text | | Email |
| perfil | text | | Perfil de viagem |
| adultos | int | DEFAULT 1 | Qtd adultos |
| criancas | int | DEFAULT 0 | Qtd crianças |
| datas_definidas | boolean | | Se tem datas definidas |
| data_ida | text | | Data de ida (DD/MM/YYYY) |
| data_volta | text | | Data de volta (DD/MM/YYYY) |
| dias_total | int | | Total de dias (se sem datas) |
| cidades | jsonb | DEFAULT '{}' | Mapa cidade→noites |
| hotel_estrelas | text | | Nível do hotel |
| hotel_opcao | text | | Opção de hotel (já tem / quer sugestão) |
| hotel_nome | text | | Nome do hotel (se já tem) |
| passeios | text[] | DEFAULT '{}' | IDs dos passeios selecionados |
| ocasiao_especial | text | | Tipo de ocasião |
| ocasiao_detalhe | text | | Detalhe da ocasião |
| ocasiao_data | text | | Data da ocasião |
| orcamento | text | | Faixa de orçamento |
| extras | text | | Observações adicionais |
| current_step | int | DEFAULT 0 | Passo atual do wizard (para retomada) |

### 3.9 Tabela `chat_messages`

Histórico de mensagens do chat com Rodrigo.

| Coluna | Tipo | Constraint | Descrição |
|--------|------|-----------|-----------|
| id | uuid | PK, DEFAULT gen_random_uuid() | ID da mensagem |
| itinerary_id | uuid | NOT NULL, FK → itineraries.id ON DELETE CASCADE | Roteiro associado |
| user_id | uuid | NOT NULL, FK → auth.users.id | Usuário |
| role | text | NOT NULL, CHECK (role IN ('user','assistant')) | Papel |
| content | text | NOT NULL | Conteúdo da mensagem |
| created_at | timestamptz | DEFAULT now() | Data/hora |

---

## 4. Row Level Security (RLS)

Todas as tabelas com dados de usuário utilizam RLS para garantir isolamento.

### Políticas:

```
-- profiles: usuário só vê/edita o próprio perfil
SELECT: auth.uid() = id
UPDATE: auth.uid() = id

-- itineraries: usuário só vê/cria/edita os próprios roteiros
SELECT: auth.uid() = user_id
INSERT: auth.uid() = user_id
UPDATE: auth.uid() = user_id
DELETE: auth.uid() = user_id

-- itinerary_answers: acesso via join com itineraries
SELECT: EXISTS (SELECT 1 FROM itineraries WHERE id = itinerary_id AND user_id = auth.uid())
INSERT: EXISTS (SELECT 1 FROM itineraries WHERE id = itinerary_id AND user_id = auth.uid())
UPDATE: EXISTS (SELECT 1 FROM itineraries WHERE id = itinerary_id AND user_id = auth.uid())

-- chat_messages: acesso via join com itineraries
SELECT: auth.uid() = user_id
INSERT: auth.uid() = user_id

-- Catálogos (cities, tours, hotel_styles, travel_profiles, budget_ranges):
SELECT: true (público, leitura para todos autenticados)
INSERT/UPDATE/DELETE: apenas service_role (admin)
```

---

## 5. Edge Functions

### 5.1 `generate-itinerary`

**Endpoint:** `POST /functions/v1/generate-itinerary`
**Auth:** Bearer token (JWT do Supabase Auth)

**Request body:**
```json
{
  "itinerary_id": "uuid"
}
```

**Fluxo:**
1. Valida JWT e extrai user_id
2. Busca `itinerary_answers` pelo `itinerary_id` (com validação de ownership)
3. Busca dados de catálogo (tours, cities) para montar o prompt
4. Monta o prompt com as regras de negócio (KNOWLEDGE + regras absolutas)
5. Chama `POST https://api.anthropic.com/v1/messages` com `claude-sonnet-4-20250514`
6. Salva resultado em `itineraries.generated_result`
7. Atualiza status para `'generated'`
8. Retorna `{ result: "texto do roteiro" }`

**Variáveis de ambiente:**
- `ANTHROPIC_API_KEY` — chave da API Claude (configurada via Supabase Dashboard > Edge Functions > Secrets)

**Regras de negócio incorporadas no prompt:**
- Cada passeio ocupa 1 dia inteiro
- Dia 1 (chegada) e último dia (partida) não têm passeio
- Máximo de passeios = total de noites da viagem
- Passeios que não cabem são listados com aviso
- Regra de distribuição de noites por cidade
- Valores de hospedagem são sempre aproximados
- Nunca sugerir hotéis específicos

### 5.2 `chat-assistant`

**Endpoint:** `POST /functions/v1/chat-assistant`
**Auth:** Bearer token (JWT do Supabase Auth)

**Request body:**
```json
{
  "itinerary_id": "uuid",
  "message": "texto da mensagem do usuário"
}
```

**Fluxo:**
1. Valida JWT e extrai user_id
2. Busca histórico de `chat_messages` para o `itinerary_id` (validando ownership)
3. Salva mensagem do usuário em `chat_messages`
4. Monta array de mensagens com histórico completo
5. Chama Claude API com system prompt KNOWLEDGE
6. Salva resposta em `chat_messages`
7. Retorna `{ reply: "texto da resposta" }`

**Limites:**
- max_tokens: 1000
- Histórico máximo enviado: últimas 50 mensagens

### 5.3 `send-to-consultant`

**Endpoint:** `POST /functions/v1/send-to-consultant`
**Auth:** Bearer token (JWT do Supabase Auth)

**Request body:**
```json
{
  "itinerary_id": "uuid"
}
```

**Fluxo:**
1. Valida JWT e extrai user_id
2. Busca `itineraries` + `itinerary_answers` (validando ownership)
3. Monta corpo do email com todos os dados + roteiro gerado
4. Chama Claude API para gerar mensagem de confirmação
5. Atualiza `itineraries.status` para `'sent_to_consultant'`
6. Salva `itineraries.consultant_response` e `itineraries.sent_at`
7. (Futuro) Envia email real via Resend/SendGrid
8. Retorna `{ message: "texto de confirmação" }`

---

## 6. Frontend — Estrutura de Páginas

### 6.1 Rotas

| Rota | Componente | Auth | Descrição |
|------|-----------|------|-----------|
| `/login` | LoginPage | Não | Login com email+senha |
| `/register` | RegisterPage | Não | Cadastro com nome, email, whatsapp, senha |
| `/` | WelcomePage | Sim | Tela de boas-vindas (adapta do JSX atual) |
| `/wizard/:id` | WizardPage | Sim | Wizard de 11 passos (usa itinerary_id) |
| `/result/:id` | ResultPage | Sim | Resultado do roteiro gerado |
| `/my-itineraries` | MyItinerariesPage | Sim | Lista de roteiros do cliente |

### 6.2 Componentes Reutilizáveis (do JSX original)

| Componente | Descrição |
|-----------|-----------|
| `DateRangePicker` | Seletor de intervalo de datas |
| `SingleDatePicker` | Seletor de data única |
| `TripTimeline` | Timeline visual da viagem |
| `ChatPanel` | Painel de chat flutuante com Rodrigo |
| `MarkdownText` | Renderizador de markdown simplificado |
| `TourImage` | Imagem de passeio com fallback |
| `BNULogo` | Logo da BNU |
| `Input` | Campo de texto estilizado |
| `NumberInput` | Campo numérico com +/- |
| `StepContent` | Conteúdo de cada passo do wizard |

### 6.3 Fluxo de Autenticação

```
Usuário abre o app
  │
  ├─ Não autenticado → /login
  │   ├─ "Criar conta" → /register
  │   └─ Login OK → / (welcome)
  │
  └─ Autenticado (sessão Supabase válida)
      └─ / (welcome)
          ├─ "Começar Meu Roteiro" → Cria itinerary no banco → /wizard/:id
          └─ "Meus Roteiros" → /my-itineraries
              ├─ Roteiro draft → /wizard/:id (retoma)
              ├─ Roteiro generated → /result/:id
              └─ Roteiro sent → /result/:id (somente leitura)
```

### 6.4 Persistência do Wizard

O wizard salva automaticamente as respostas no banco a cada mudança de passo (`current_step`), permitindo:
- Fechar o navegador e retomar de onde parou
- Navegar para outras páginas sem perder progresso
- Múltiplos roteiros em paralelo

**Estratégia de salvamento:**
- Debounce de 2 segundos após cada alteração
- Salvamento forçado ao mudar de passo (botão "Próximo"/"Voltar")
- Indicador visual de "Salvando..." / "Salvo"

### 6.5 Integração com Supabase Client

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

**Variáveis de ambiente do frontend (.env):**
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 7. Knowledge Base (Regras de Negócio)

O KNOWLEDGE é armazenado como constante no código das Edge Functions (não no banco), pois:
- É estático e raramente muda
- Precisa ser enviado como system prompt a cada chamada da API
- Versionado junto com o código

**Conteúdo completo do KNOWLEDGE** (extraído do JSX original):

```
Você é Rodrigo, consultor virtual da agência "Brasileiros no Uruguai" (BNU)...
[todo o conteúdo da constante KNOWLEDGE do arquivo JSX]
```

Inclui:
- Preços de passeios regulares e privativos
- Preços de transfers
- Alternativa econômica de locomoção entre cidades
- Estimativas de hotel por cidade e estrelas
- Ajustes sazonais (jul +20%, dez/jan +20/40%)
- Regras de desconto (5% para 3+ passeios, 4+ pessoas)
- Formas de pagamento

---

## 8. Edge Functions — Detalhamento Técnico

### 8.1 Estrutura dos arquivos

```
supabase/
  functions/
    _shared/
      knowledge.ts      ← constante KNOWLEDGE compartilhada
      cors.ts           ← headers CORS
      auth.ts           ← helper para validar JWT e extrair user_id
    generate-itinerary/
      index.ts
    chat-assistant/
      index.ts
    send-to-consultant/
      index.ts
```

### 8.2 Autenticação nas Edge Functions

```typescript
// _shared/auth.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) throw new Error("Missing auth header")

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error("Unauthorized")

  return { user, supabase }
}
```

### 8.3 CORS

```typescript
// _shared/cors.ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
```

### 8.4 Rate Limiting

Implementado via contagem de chamadas por user_id em janela de tempo:
- `chat-assistant`: máx 30 chamadas/minuto por usuário
- `generate-itinerary`: máx 5 chamadas/hora por usuário
- `send-to-consultant`: máx 3 chamadas/hora por usuário

Controle feito via tabela auxiliar `rate_limits` ou via cache na Edge Function.

---

## 9. Segurança

### 9.1 Checklist

| Item | Implementação |
|------|--------------|
| API Key Claude nunca no frontend | Edge Functions usam `ANTHROPIC_API_KEY` como secret |
| Isolamento de dados | RLS em todas as tabelas de usuário |
| Validação de ownership | Toda Edge Function valida que o `itinerary_id` pertence ao `user_id` autenticado |
| Input sanitization | Textos do usuário são escapados antes de inserção |
| Rate limiting | Limites por user_id por endpoint |
| CORS | Configurado para domínio de produção |
| Senhas | Gerenciadas pelo Supabase Auth (bcrypt + salt) |
| JWT | Tokens com expiração de 1h, refresh automático |

### 9.2 Variáveis de Ambiente (Secrets)

**Supabase Edge Functions:**
- `ANTHROPIC_API_KEY` — API key da Anthropic
- `SUPABASE_URL` — URL do projeto (auto-injetada)
- `SUPABASE_SERVICE_ROLE_KEY` — Chave de serviço (auto-injetada)

**Frontend (.env):**
- `VITE_SUPABASE_URL` — URL pública do Supabase
- `VITE_SUPABASE_ANON_KEY` — Chave anon pública

---

## 10. Plano de Implementação

### Fase 1 — Infraestrutura (Semana 1)

- [ ] Criar projeto Supabase
- [ ] Executar todas as migrations (ver seção de migrations)
- [ ] Configurar secrets (`ANTHROPIC_API_KEY`)
- [ ] Configurar autenticação (email/password habilitado)
- [ ] Deploy inicial das Edge Functions

### Fase 2 — Frontend Base (Semana 1-2)

- [ ] Criar projeto React + Vite + TypeScript
- [ ] Instalar `@supabase/supabase-js`
- [ ] Implementar páginas de Login e Registro
- [ ] Implementar AuthContext/Provider
- [ ] Implementar roteamento protegido (react-router-dom)
- [ ] Migrar componentes do JSX original para componentes separados

### Fase 3 — Wizard + Persistência (Semana 2-3)

- [ ] Implementar criação de itinerary no banco ao clicar "Começar"
- [ ] Implementar auto-save do wizard com debounce
- [ ] Carregar dados do catálogo (tours, cities, etc.) do banco
- [ ] Implementar retomada de roteiro em andamento
- [ ] Implementar `current_step` tracking

### Fase 4 — Edge Functions + IA (Semana 3)

- [ ] Implementar `generate-itinerary` Edge Function
- [ ] Implementar `chat-assistant` Edge Function
- [ ] Implementar `send-to-consultant` Edge Function
- [ ] Integrar frontend com Edge Functions
- [ ] Testar fluxo completo

### Fase 5 — Histórico + Polish (Semana 4)

- [ ] Implementar página "Meus Roteiros"
- [ ] Implementar visualização de roteiro já gerado
- [ ] Implementar estado "sent_to_consultant" (somente leitura)
- [ ] Responsive design
- [ ] Tratamento de erros
- [ ] Loading states

### Fase 6 — Testes + Deploy (Semana 4-5)

- [ ] Executar suite de testes Python
- [ ] Corrigir bugs encontrados
- [ ] Configurar domínio customizado
- [ ] Deploy final

---

## 11. Migrations — Ordem de Execução

As migrations estão na pasta `supabase/migrations/` e devem ser executadas em ordem numérica:

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `00001_create_profiles.sql` | Tabela profiles + trigger de criação automática |
| 2 | `00002_create_catalog_tables.sql` | cities, tours, hotel_styles, travel_profiles, budget_ranges |
| 3 | `00003_seed_catalog_data.sql` | Dados iniciais do catálogo (extraídos do JSX) |
| 4 | `00004_create_itineraries.sql` | Tabela itineraries |
| 5 | `00005_create_itinerary_answers.sql` | Tabela itinerary_answers |
| 6 | `00006_create_chat_messages.sql` | Tabela chat_messages |
| 7 | `00007_create_rls_policies.sql` | Todas as políticas de RLS |
| 8 | `00008_create_indexes.sql` | Índices para performance |
| 9 | `00009_create_updated_at_trigger.sql` | Trigger para auto-update de updated_at |

---

## 12. Testes — Estratégia

### 12.1 Testes de Backend (Python + pytest + httpx)

Testam diretamente as APIs do Supabase (REST + Edge Functions):

| Módulo | Cobertura |
|--------|----------|
| `test_auth.py` | Registro, login, token inválido, perfil auto-criado |
| `test_catalog.py` | Leitura de catálogos (cities, tours, hotel_styles, etc.) |
| `test_itineraries.py` | CRUD de itineraries, RLS (não ver roteiro de outro user) |
| `test_answers.py` | CRUD de itinerary_answers, vínculo com itinerary |
| `test_chat.py` | Envio/leitura de chat_messages, RLS |
| `test_edge_generate.py` | Edge Function generate-itinerary |
| `test_edge_chat.py` | Edge Function chat-assistant |
| `test_edge_consultant.py` | Edge Function send-to-consultant |
| `test_rls.py` | Validação completa de isolamento entre usuários |

### 12.2 Testes de Frontend (Python + Playwright)

Testam a interface via browser automatizado:

| Módulo | Cobertura |
|--------|----------|
| `test_ui_auth.py` | Fluxo de registro e login |
| `test_ui_wizard.py` | Navegação completa do wizard (11 passos) |
| `test_ui_chat.py` | Abertura do chat, envio de mensagem, resposta |
| `test_ui_result.py` | Visualização do resultado, envio para consultora |
| `test_ui_history.py` | Página "Meus Roteiros", retomada |

### 12.3 Execução

```bash
# Instalar dependências
pip install -r tests/requirements.txt

# Executar todos os testes de backend
pytest tests/backend/ -v

# Executar todos os testes de frontend
pytest tests/frontend/ -v

# Executar tudo
pytest tests/ -v --tb=short
```

---

## 13. Catálogo de Dados (Seed)

Dados extraídos diretamente do JSX original:

### Cidades
- `mvd` — Montevideo 🏙️ — Capital e maior cidade
- `pde` — Punta del Este 🏖️ — Praias e luxo
- `col` — Colonia del Sacramento 🏛️ — Patrimônio histórico
- `jose` — José Ignacio 🌿 — Charme e natureza
- `carmelo` — Carmelo 🍇 — Vinhedos e sossego
- `outro` — Outro 📍 — Outra cidade

### Passeios
| ID | Nome | R$/pessoa | Cidade Base |
|----|------|----------|-------------|
| city_mvd | City Tour Montevideo | 129 | Montevideo |
| city_pde | City Tour Punta del Este | 240 | Montevideo |
| city_col | City Tour Colonia del Sacramento | 395 | Montevideo |
| pizzorno | Almoço na Bodega Pizzorno | 720 | Montevideo |
| bouza | Degustação na Bodega Bouza | 520 | Montevideo |
| primuseum | Primuseum: Jantar & Tango | 690 | Montevideo |
| milongon | El Milongón: Danças Típicas | 820 | Montevideo |
| daytour_pde | Day Tour Punta (saindo de Punta) | 370 | Punta del Este |

### Perfis de Viagem
- casal 👫 — Casal
- familia 👨‍👩‍👧‍👦 — Família com crianças
- amigos 🧑‍🤝‍🧑 — Grupo de amigos
- lua_de_mel 💍 — Lua de mel
- solo 🧳 — Viagem solo
- negocios 💼 — Viagem a negócios

### Estilos de Hotel
- 3 ★★★ — Econômico
- 4 ★★★★ — Intermediário
- 5 ★★★★★ — Superior / Premium

### Faixas de Orçamento
- Até R$ 3.500 por pessoa
- R$ 3.500 a R$ 5.000 por pessoa
- R$ 5.000 a R$ 8.000 por pessoa
- R$ 8.000 a R$ 12.000 por pessoa
- Acima de R$ 12.000 por pessoa

---

## 14. Requisitos Não-Funcionais

| Requisito | Meta |
|----------|------|
| Tempo de resposta do chat | < 5s (depende da API Claude) |
| Tempo de geração de roteiro | < 15s |
| Disponibilidade | 99.5% (Supabase SLA) |
| Suporte a dispositivos | Desktop + Mobile (responsive) |
| Browsers | Chrome, Safari, Firefox, Edge (últimas 2 versões) |
| Acessibilidade | WCAG 2.1 nível A mínimo |
| Idioma | Português do Brasil |

---

## 15. Glossário

| Termo | Definição |
|-------|----------|
| BNU | Brasileiros no Uruguai — nome da agência |
| Rodrigo | Consultor virtual (IA) disponível via chat |
| Consultora Especialista | Humana que recebe o roteiro para confirmar e fechar |
| Pré-Roteiro | Roteiro sugerido pela IA (não confirmado) |
| Pré-Orçamento | Valores estimados pela IA (confirmados pela consultora) |
| KNOWLEDGE | Base de conhecimento com preços e regras do negócio |
| Wizard | Formulário de 11 passos para coleta de preferências |
