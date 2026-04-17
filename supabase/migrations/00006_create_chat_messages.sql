-- ============================================================
-- Migration 00006: Tabela chat_messages
-- ============================================================
-- Histórico de mensagens do chat com Rodrigo (consultor IA).
-- Vinculado a um itinerary para contexto por roteiro.

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id  uuid        NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content       text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.chat_messages IS 'Histórico de mensagens do chat com o consultor virtual Rodrigo, por roteiro.';
