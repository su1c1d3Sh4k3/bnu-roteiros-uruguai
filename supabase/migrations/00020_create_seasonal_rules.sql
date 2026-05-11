-- ============================================================
-- Migration 00020: Criar tabela seasonal_rules
-- Regras de sazonalidade editaveis pelo admin
-- ============================================================

CREATE TABLE IF NOT EXISTS public.seasonal_rules (
  id SERIAL PRIMARY KEY,
  city_id TEXT NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  months INTEGER[] NOT NULL,        -- meses do ano (1-12)
  percentage NUMERIC NOT NULL,       -- percentual de aumento (ex: 20 = +20%)
  label TEXT NOT NULL DEFAULT '',    -- descricao curta (ex: "Julho e feriados")
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Unique: cada cidade so pode ter uma regra por conjunto de meses
CREATE UNIQUE INDEX IF NOT EXISTS seasonal_rules_city_months_idx
  ON public.seasonal_rules (city_id, months);

-- Seed com regras atuais
INSERT INTO public.seasonal_rules (city_id, months, percentage, label) VALUES
  ('mvd', ARRAY[7], 20, 'Julho e feriados'),
  ('mvd', ARRAY[12,1], 20, 'Dezembro e Janeiro'),
  ('col', ARRAY[7], 20, 'Julho e feriados'),
  ('col', ARRAY[12,1], 20, 'Dezembro e Janeiro'),
  ('pde', ARRAY[12,1], 40, 'Dezembro e Janeiro')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.seasonal_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seasonal_rules_select" ON public.seasonal_rules
  FOR SELECT USING (true);

CREATE POLICY "seasonal_rules_admin_all" ON public.seasonal_rules
  FOR ALL USING (public.is_admin());
