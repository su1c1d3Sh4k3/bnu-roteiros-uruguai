-- ============================================================
-- Migration 00012: Tabela de transfers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transfers (
  id           TEXT          PRIMARY KEY,
  nome         TEXT          NOT NULL,
  descricao    TEXT          DEFAULT '',
  price_1_2    NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_3_6    NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_7_11   NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_12_15  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo        BOOLEAN       NOT NULL DEFAULT true,
  sort_order   INT           NOT NULL DEFAULT 0
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.transfers IS 'Tabela de preços de transfers por rota e tamanho de grupo.';
COMMENT ON COLUMN public.transfers.price_1_2   IS 'Preço total para grupo de 1-2 pessoas';
COMMENT ON COLUMN public.transfers.price_3_6   IS 'Preço total para grupo de 3-6 pessoas';
COMMENT ON COLUMN public.transfers.price_7_11  IS 'Preço total para grupo de 7-11 pessoas';
COMMENT ON COLUMN public.transfers.price_12_15 IS 'Preço total para grupo de 12-15 pessoas';

-- Seed com dados do knowledge.ts
INSERT INTO public.transfers (id, nome, descricao, price_1_2, price_3_6, price_7_11, price_12_15, sort_order) VALUES
  (
    'aeroporto_mvd',
    'Aeroporto de Montevideo',
    'Transfer entre o Aeroporto Internacional de Carrasco e hotéis em Montevideo.',
    360.00, 550.00, 702.00, 900.00, 1
  ),
  (
    'mvd_punta',
    'Montevideo → Punta del Este',
    'Transfer entre Montevideo e Punta del Este (134km). Ida ou volta.',
    1950.00, 2600.00, 3000.00, 3200.00, 2
  ),
  (
    'mvd_colonia',
    'Montevideo → Colonia del Sacramento',
    'Transfer entre Montevideo e Colonia del Sacramento (180km). Ida ou volta.',
    2700.00, 3100.00, 3400.00, 3700.00, 3
  )
ON CONFLICT (id) DO UPDATE SET
  nome        = EXCLUDED.nome,
  descricao   = EXCLUDED.descricao,
  price_1_2   = EXCLUDED.price_1_2,
  price_3_6   = EXCLUDED.price_3_6,
  price_7_11  = EXCLUDED.price_7_11,
  price_12_15 = EXCLUDED.price_12_15,
  sort_order  = EXCLUDED.sort_order;
