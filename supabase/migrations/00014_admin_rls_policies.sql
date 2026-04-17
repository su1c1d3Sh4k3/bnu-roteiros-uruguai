-- ============================================================
-- Migration 00014: RLS policies para tabelas do admin
-- ============================================================

-- --------------------------------------------------------
-- Helper: função para verificar se usuário é admin
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- --------------------------------------------------------
-- hotel_prices: leitura pública, escrita apenas admin
-- --------------------------------------------------------
CREATE POLICY "hotel_prices_select_public"
  ON public.hotel_prices FOR SELECT
  USING (true);

CREATE POLICY "hotel_prices_all_admin"
  ON public.hotel_prices FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------
-- transfers: leitura pública, escrita apenas admin
-- --------------------------------------------------------
CREATE POLICY "transfers_select_public"
  ON public.transfers FOR SELECT
  USING (true);

CREATE POLICY "transfers_all_admin"
  ON public.transfers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------
-- ai_prompt_config: leitura para todos autenticados (edge functions usam service role),
-- escrita apenas admin
-- --------------------------------------------------------
CREATE POLICY "ai_prompt_config_select_authenticated"
  ON public.ai_prompt_config FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "ai_prompt_config_write_admin"
  ON public.ai_prompt_config FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------
-- ai_documents: leitura para todos autenticados, escrita apenas admin
-- --------------------------------------------------------
CREATE POLICY "ai_documents_select_authenticated"
  ON public.ai_documents FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "ai_documents_all_admin"
  ON public.ai_documents FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------
-- tours: escrita apenas admin (SELECT já era público via migration 00007)
-- --------------------------------------------------------
DROP POLICY IF EXISTS "tours_all_admin" ON public.tours;
CREATE POLICY "tours_all_admin"
  ON public.tours FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------
-- cities: escrita apenas admin
-- --------------------------------------------------------
DROP POLICY IF EXISTS "cities_all_admin" ON public.cities;
CREATE POLICY "cities_all_admin"
  ON public.cities FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------
-- hotel_styles: escrita apenas admin
-- --------------------------------------------------------
DROP POLICY IF EXISTS "hotel_styles_all_admin" ON public.hotel_styles;
CREATE POLICY "hotel_styles_all_admin"
  ON public.hotel_styles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------
-- profiles: admin pode ler todos os perfis
-- --------------------------------------------------------
DROP POLICY IF EXISTS "profiles_admin_select_all" ON public.profiles;
CREATE POLICY "profiles_admin_select_all"
  ON public.profiles FOR SELECT
  USING (public.is_admin() OR id = auth.uid());
