-- ============================================================
-- Migration 00007: Row Level Security — todas as políticas
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PROFILES
-- ──────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ──────────────────────────────────────────────────────────
-- CATÁLOGOS — leitura pública para autenticados
-- ──────────────────────────────────────────────────────────
CREATE POLICY "cities_select_all"
  ON public.cities FOR SELECT
  USING (true);

CREATE POLICY "tours_select_all"
  ON public.tours FOR SELECT
  USING (true);

CREATE POLICY "hotel_styles_select_all"
  ON public.hotel_styles FOR SELECT
  USING (true);

CREATE POLICY "travel_profiles_select_all"
  ON public.travel_profiles FOR SELECT
  USING (true);

CREATE POLICY "budget_ranges_select_all"
  ON public.budget_ranges FOR SELECT
  USING (true);

-- ──────────────────────────────────────────────────────────
-- ITINERARIES — CRUD restrito ao dono
-- ──────────────────────────────────────────────────────────
CREATE POLICY "itineraries_select_own"
  ON public.itineraries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "itineraries_insert_own"
  ON public.itineraries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "itineraries_update_own"
  ON public.itineraries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "itineraries_delete_own"
  ON public.itineraries FOR DELETE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- ITINERARY_ANSWERS — acesso via ownership do itinerary
-- ──────────────────────────────────────────────────────────
CREATE POLICY "answers_select_own"
  ON public.itinerary_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE id = itinerary_answers.itinerary_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "answers_insert_own"
  ON public.itinerary_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE id = itinerary_answers.itinerary_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "answers_update_own"
  ON public.itinerary_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE id = itinerary_answers.itinerary_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE id = itinerary_answers.itinerary_id
        AND user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────
-- CHAT_MESSAGES — leitura/escrita restrita ao dono
-- ──────────────────────────────────────────────────────────
CREATE POLICY "chat_select_own"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "chat_insert_own"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
