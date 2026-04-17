-- ============================================================
-- Migration 00005: Tabela itinerary_answers
-- ============================================================
-- Respostas do wizard, relação 1:1 com itineraries.
-- Armazena cada campo do formulário de 11 passos.

CREATE TABLE IF NOT EXISTS public.itinerary_answers (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id      uuid    NOT NULL UNIQUE REFERENCES public.itineraries(id) ON DELETE CASCADE,

  -- Step 1: Dados de contato
  nome              text    DEFAULT '',
  whatsapp          text    DEFAULT '',
  email             text    DEFAULT '',

  -- Step 2: Perfil da viagem
  perfil            text    DEFAULT '',

  -- Step 3: Tamanho do grupo
  adultos           int     DEFAULT 1,
  criancas          int     DEFAULT 0,

  -- Step 4: Datas
  datas_definidas   boolean,
  data_ida          text    DEFAULT '',    -- formato DD/MM/YYYY
  data_volta        text    DEFAULT '',    -- formato DD/MM/YYYY
  dias_total        int,                   -- se datas não definidas

  -- Step 5: Cidades e noites
  cidades           jsonb   NOT NULL DEFAULT '{}'::jsonb,   -- ex: {"mvd": 3, "pde": 2}

  -- Step 6: Estilo de hotel
  hotel_estrelas    text    DEFAULT '',

  -- Step 7: Preferência de hotel
  hotel_opcao       text    DEFAULT '',    -- "Ja tenho hotel em mente" ou "Quero sugestoes de hoteis"
  hotel_nome        text    DEFAULT '',    -- nome se já tem

  -- Step 8: Passeios selecionados
  passeios          text[]  NOT NULL DEFAULT '{}',

  -- Step 9: Ocasião especial
  ocasiao_especial  text    DEFAULT '',
  ocasiao_detalhe   text    DEFAULT '',
  ocasiao_data      text    DEFAULT '',    -- formato DD/MM/YYYY

  -- Step 10: Orçamento
  orcamento         text    DEFAULT '',

  -- Step 11: Extras
  extras            text    DEFAULT '',

  -- Controle do wizard
  current_step      int     NOT NULL DEFAULT 0
);

ALTER TABLE public.itinerary_answers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.itinerary_answers IS 'Respostas do wizard de 11 passos, 1:1 com itineraries. Auto-salvo a cada mudança de passo.';
COMMENT ON COLUMN public.itinerary_answers.cidades IS 'JSON com mapa cidade_id → quantidade de noites. Ex: {"mvd": 3, "pde": 2}';
COMMENT ON COLUMN public.itinerary_answers.passeios IS 'Array de IDs de passeios selecionados do catálogo tours.';
COMMENT ON COLUMN public.itinerary_answers.current_step IS 'Passo atual do wizard (0-10) para retomada de sessão.';
