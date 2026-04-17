-- ============================================================
-- Migration 00002: Tabelas de catálogo
-- ============================================================
-- Tabelas de referência: cities, tours, hotel_styles, travel_profiles, budget_ranges
-- Dados são públicos para leitura (qualquer usuário autenticado).

-- CIDADES
CREATE TABLE IF NOT EXISTS public.cities (
  id          text PRIMARY KEY,
  nome        text NOT NULL,
  emoji       text DEFAULT '',
  description text DEFAULT '',
  sort_order  int  DEFAULT 0
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.cities IS 'Catálogo de cidades disponíveis para roteiros no Uruguai.';

-- PASSEIOS / TOURS
CREATE TABLE IF NOT EXISTS public.tours (
  id                text        PRIMARY KEY,
  nome              text        NOT NULL,
  valor_por_pessoa  numeric(10,2) NOT NULL,
  emoji             text        DEFAULT '',
  description       text        DEFAULT '',
  dias_min          int         DEFAULT 1,
  cidade_base       text        REFERENCES public.cities(id),
  image_url         text        DEFAULT '',
  ativo             boolean     DEFAULT true,
  sort_order        int         DEFAULT 0
);

ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tours IS 'Catálogo de passeios regulares oferecidos pela BNU.';

-- ESTILOS DE HOTEL
CREATE TABLE IF NOT EXISTS public.hotel_styles (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  description text DEFAULT '',
  emoji       text DEFAULT '',
  stars       text DEFAULT '',
  sort_order  int  DEFAULT 0
);

ALTER TABLE public.hotel_styles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.hotel_styles IS 'Categorias de hospedagem (3/4/5 estrelas).';

-- PERFIS DE VIAGEM
CREATE TABLE IF NOT EXISTS public.travel_profiles (
  id         text PRIMARY KEY,
  label      text NOT NULL,
  emoji      text DEFAULT '',
  sort_order int  DEFAULT 0
);

ALTER TABLE public.travel_profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.travel_profiles IS 'Perfis de grupo de viajantes (casal, família, etc).';

-- FAIXAS DE ORÇAMENTO
CREATE TABLE IF NOT EXISTS public.budget_ranges (
  id         text           PRIMARY KEY,
  label      text           NOT NULL,
  min_value  numeric(10,2)  DEFAULT NULL,
  max_value  numeric(10,2)  DEFAULT NULL,
  sort_order int            DEFAULT 0
);

ALTER TABLE public.budget_ranges ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.budget_ranges IS 'Faixas de orçamento por pessoa para filtro de viagem.';
