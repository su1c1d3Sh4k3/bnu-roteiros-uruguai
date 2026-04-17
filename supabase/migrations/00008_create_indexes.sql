-- ============================================================
-- Migration 00008: Índices para performance
-- ============================================================

-- Itineraries: busca por user_id (lista "Meus Roteiros")
CREATE INDEX IF NOT EXISTS idx_itineraries_user_id
  ON public.itineraries (user_id);

-- Itineraries: ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_itineraries_created_at
  ON public.itineraries (created_at DESC);

-- Itinerary Answers: busca por itinerary_id (já tem UNIQUE, mas explícito)
CREATE INDEX IF NOT EXISTS idx_itinerary_answers_itinerary_id
  ON public.itinerary_answers (itinerary_id);

-- Chat Messages: busca por itinerary_id + ordenação cronológica
CREATE INDEX IF NOT EXISTS idx_chat_messages_itinerary_id
  ON public.chat_messages (itinerary_id, created_at ASC);

-- Chat Messages: busca por user_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
  ON public.chat_messages (user_id);

-- Tours: filtro por ativo + ordenação
CREATE INDEX IF NOT EXISTS idx_tours_ativo_sort
  ON public.tours (ativo, sort_order) WHERE ativo = true;

-- Catálogos: ordenação por sort_order
CREATE INDEX IF NOT EXISTS idx_cities_sort
  ON public.cities (sort_order);

CREATE INDEX IF NOT EXISTS idx_hotel_styles_sort
  ON public.hotel_styles (sort_order);

CREATE INDEX IF NOT EXISTS idx_travel_profiles_sort
  ON public.travel_profiles (sort_order);

CREATE INDEX IF NOT EXISTS idx_budget_ranges_sort
  ON public.budget_ranges (sort_order);
