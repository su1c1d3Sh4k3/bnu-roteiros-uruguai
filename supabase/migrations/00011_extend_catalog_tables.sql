-- ============================================================
-- Migration 00011: Estender tabelas de catálogo para o painel admin
-- ============================================================

-- Adicionar colunas faltantes na tabela tours
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS duration        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS private_pricing JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS link_url        TEXT DEFAULT '';

-- Atualizar tours existentes com duração e preços privativos
UPDATE public.tours SET
  duration        = '4h',
  private_pricing = '{"1-3": 1650, "4-9": 2600, "10-12": 3040, "12-15": 3380}'::jsonb,
  link_url        = 'https://brasileirosnouruguai.com.br/passeios/city-tour-montevideo/'
WHERE id = 'city_mvd';

UPDATE public.tours SET
  duration        = '9h',
  private_pricing = '{"1-3": 3850, "4-9": 4950, "10-12": 5650, "12-15": 6850}'::jsonb,
  link_url        = 'https://brasileirosnouruguai.com.br/passeios/city-tour-punta-del-este/'
WHERE id = 'city_pde';

UPDATE public.tours SET
  duration        = '9h',
  private_pricing = '{"1-3": 4750, "4-9": 5850, "10-12": 6850, "12-15": 7350}'::jsonb,
  link_url        = 'https://brasileirosnouruguai.com.br/passeios/city-tour-colonia-del-sacramento/'
WHERE id = 'city_col';

UPDATE public.tours SET duration = '6h', link_url = 'https://brasileirosnouruguai.com.br/passeios/bodega-pizzorno-visita-e-almoco/'   WHERE id = 'pizzorno';
UPDATE public.tours SET duration = '5h', link_url = 'https://brasileirosnouruguai.com.br/passeios/bodega-bouza-visita-e-almoco/'       WHERE id = 'bouza';
UPDATE public.tours SET duration = '4h'                                                                                                 WHERE id = 'primuseum';
UPDATE public.tours SET duration = '4h'                                                                                                 WHERE id = 'milongon';
UPDATE public.tours SET duration = '4h'                                                                                                 WHERE id = 'daytour_pde';

-- --------------------------------------------------------
-- Tabela de preços de hotel por cidade e categoria
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotel_prices (
  id              SERIAL        PRIMARY KEY,
  city_id         TEXT          NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  hotel_style_id  TEXT          NOT NULL REFERENCES public.hotel_styles(id) ON DELETE CASCADE,
  price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0,
  season_note     TEXT          DEFAULT '',
  UNIQUE (city_id, hotel_style_id)
);

ALTER TABLE public.hotel_prices ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.hotel_prices IS 'Preços aproximados de hospedagem por cidade e categoria de hotel.';

-- Seed com dados do knowledge.ts
-- Montevideo
INSERT INTO public.hotel_prices (city_id, hotel_style_id, price_per_night, season_note) VALUES
  ('mvd', '3', 235.00, 'Julho +20%. Dez/Jan +20%.'),
  ('mvd', '4', 300.00, 'Julho +20%. Dez/Jan +20%.'),
  ('mvd', '5', 600.00, 'Julho +20%. Dez/Jan +20%.')
ON CONFLICT (city_id, hotel_style_id) DO UPDATE SET
  price_per_night = EXCLUDED.price_per_night,
  season_note     = EXCLUDED.season_note;

-- Punta del Este
INSERT INTO public.hotel_prices (city_id, hotel_style_id, price_per_night, season_note) VALUES
  ('pde', '3', 250.00, 'Dez/Jan +40%.'),
  ('pde', '4', 300.00, 'Dez/Jan +40%.'),
  ('pde', '5', 850.00, 'Dez/Jan +40%.')
ON CONFLICT (city_id, hotel_style_id) DO UPDATE SET
  price_per_night = EXCLUDED.price_per_night,
  season_note     = EXCLUDED.season_note;

-- Colonia del Sacramento
INSERT INTO public.hotel_prices (city_id, hotel_style_id, price_per_night, season_note) VALUES
  ('col', '3', 315.00, 'Julho +20%. Dez/Jan +20%.'),
  ('col', '4', 340.00, 'Julho +20%. Dez/Jan +20%.'),
  ('col', '5', 470.00, 'Julho +20%. Dez/Jan +20%.')
ON CONFLICT (city_id, hotel_style_id) DO UPDATE SET
  price_per_night = EXCLUDED.price_per_night,
  season_note     = EXCLUDED.season_note;
