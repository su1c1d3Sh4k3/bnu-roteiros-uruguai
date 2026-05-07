-- ============================================================
-- Migration 00016: Adicionar tipo de quarto nos precos de hotel
-- hotel_prices agora tem room_type (individual/duplo/triplo)
-- itinerary_answers ganha coluna hotel_quartos (JSONB)
-- ============================================================

-- 1. Adicionar coluna room_type com default 'duplo' (registros existentes sao duplo)
ALTER TABLE public.hotel_prices
  ADD COLUMN IF NOT EXISTS room_type TEXT NOT NULL DEFAULT 'duplo';

-- 2. Trocar constraint UNIQUE para incluir room_type
ALTER TABLE public.hotel_prices
  DROP CONSTRAINT IF EXISTS hotel_prices_city_id_hotel_style_id_key;

ALTER TABLE public.hotel_prices
  ADD CONSTRAINT hotel_prices_city_style_room_key
  UNIQUE (city_id, hotel_style_id, room_type);

-- 3. Atualizar season_note dos registros duplo existentes
UPDATE public.hotel_prices SET season_note = 'Julho e feriados +20%. Dez/Jan +20%.' WHERE city_id IN ('mvd','col') AND room_type = 'duplo';
UPDATE public.hotel_prices SET season_note = 'Dez/Jan +40%.' WHERE city_id = 'pde' AND room_type = 'duplo';

-- 4. Inserir precos INDIVIDUAL
INSERT INTO public.hotel_prices (city_id, hotel_style_id, room_type, price_per_night, season_note) VALUES
  ('mvd', '3', 'individual', 470.00, 'Julho e feriados +20%. Dez/Jan +20%.'),
  ('mvd', '4', 'individual', 555.00, 'Julho e feriados +20%. Dez/Jan +20%.'),
  ('mvd', '5', 'individual', 1100.00, 'Julho e feriados +20%. Dez/Jan +20%.'),
  ('pde', '3', 'individual', 470.00, 'Dez/Jan +40%.'),
  ('pde', '4', 'individual', 680.00, 'Dez/Jan +40%.'),
  ('pde', '5', 'individual', 1700.00, 'Dez/Jan +40%.'),
  ('col', '3', 'individual', 620.00, 'Julho e feriados +20%. Dez/Jan +20%.'),
  ('col', '4', 'individual', 685.00, 'Julho e feriados +20%. Dez/Jan +20%.'),
  ('col', '5', 'individual', 940.00, 'Julho e feriados +20%. Dez/Jan +20%.')
ON CONFLICT (city_id, hotel_style_id, room_type) DO UPDATE SET
  price_per_night = EXCLUDED.price_per_night,
  season_note     = EXCLUDED.season_note;

-- 5. Inserir precos TRIPLO (sem 5 estrelas em Punta del Este)
INSERT INTO public.hotel_prices (city_id, hotel_style_id, room_type, price_per_night, season_note) VALUES
  ('mvd', '3', 'triplo', 214.00, 'Julho e feriados +20%. Dez/Jan +20%.'),
  ('mvd', '4', 'triplo', 260.00, 'Julho e feriados +20%. Dez/Jan +20%.'),
  ('mvd', '5', 'triplo', 570.00, 'Julho e feriados +20%. Dez/Jan +20%.'),
  ('pde', '3', 'triplo', 230.00, 'Dez/Jan +40%.'),
  ('pde', '4', 'triplo', 340.00, 'Dez/Jan +40%.'),
  ('col', '3', 'triplo', 235.00, 'Julho e feriados +20%. Dez/Jan +20%.'),
  ('col', '4', 'triplo', 350.00, 'Julho e feriados +20%. Dez/Jan +20%.'),
  ('col', '5', 'triplo', 420.00, 'Julho e feriados +20%. Dez/Jan +20%.')
ON CONFLICT (city_id, hotel_style_id, room_type) DO UPDATE SET
  price_per_night = EXCLUDED.price_per_night,
  season_note     = EXCLUDED.season_note;

-- 6. Adicionar coluna hotel_quartos na tabela itinerary_answers
ALTER TABLE public.itinerary_answers
  ADD COLUMN IF NOT EXISTS hotel_quartos JSONB DEFAULT '{}'::jsonb;
