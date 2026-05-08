-- Create combos table for tour packages with discount pricing
CREATE TABLE IF NOT EXISTS public.combos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  emoji TEXT DEFAULT '🎁',
  description TEXT DEFAULT '',
  tour_ids TEXT[] NOT NULL DEFAULT '{}',
  preco_combo NUMERIC NOT NULL DEFAULT 0,
  dias_min INT NOT NULL DEFAULT 1,
  image_url TEXT DEFAULT '',
  ativo BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "combos_public_read" ON public.combos
  FOR SELECT USING (true);

-- Admin write
CREATE POLICY "combos_admin_insert" ON public.combos
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "combos_admin_update" ON public.combos
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "combos_admin_delete" ON public.combos
  FOR DELETE USING (public.is_admin());

-- Seed test combo: Combo 3 Cidades
INSERT INTO public.combos (id, nome, emoji, description, tour_ids, preco_combo, dias_min, ativo, sort_order)
VALUES (
  'combo_3cidades',
  'Combo 3 Cidades',
  '🏆',
  'City Tour Montevideo + City Tour Punta del Este + City Tour Colonia del Sacramento com desconto especial.',
  ARRAY['city_mvd', 'city_pde', 'city_col'],
  715,
  3,
  true,
  1
);
