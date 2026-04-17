-- ============================================================
-- Migration 00004: Tabela itineraries
-- ============================================================
-- Cada roteiro criado pelo cliente gera um registro aqui.
-- Status: draft → generated → sent_to_consultant

CREATE TABLE IF NOT EXISTS public.itineraries (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status               text        NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft', 'generated', 'sent_to_consultant')),
  generated_result     text,
  consultant_response  text,
  sent_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.itineraries IS 'Roteiros de viagem criados pelos clientes. Ciclo: draft → generated → sent_to_consultant.';
COMMENT ON COLUMN public.itineraries.status IS 'draft=em preenchimento, generated=roteiro gerado pela IA, sent_to_consultant=enviado para consultora humana';
