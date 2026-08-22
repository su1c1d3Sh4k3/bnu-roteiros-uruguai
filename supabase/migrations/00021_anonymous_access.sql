-- ============================================================
-- Migration 00021: Acesso anônimo + busca de roteiros por contato
-- ============================================================
-- O app deixa de exigir login: usuários entram com sessão anônima
-- (Anonymous Sign-ins habilitado no Supabase Auth).
-- Roteiros continuam atrelados a user_id (usuário anônimo).
-- Para recuperar roteiros em outro navegador/aparelho, o cliente
-- busca pelo e-mail ou telefone informado na etapa 1 do wizard.
-- A função reatribui (claim) os roteiros encontrados para o
-- usuário anônimo atual, fazendo RLS e Edge Functions funcionarem.

CREATE OR REPLACE FUNCTION public.claim_itineraries_by_contact(p_contact text)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact  text := lower(trim(coalesce(p_contact, '')));
  v_digits   text := regexp_replace(v_contact, '\D', '', 'g');
  v_is_email boolean := position('@' in v_contact) > 1;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF v_is_email THEN
    -- Busca por e-mail exato (case-insensitive)
    IF length(v_contact) < 6 THEN
      RETURN;
    END IF;
    RETURN QUERY
    UPDATE public.itineraries i
       SET user_id = auth.uid(),
           updated_at = now()
      FROM public.itinerary_answers a
     WHERE a.itinerary_id = i.id
       AND lower(trim(coalesce(a.email, ''))) = v_contact
    RETURNING i.id;
  ELSE
    -- Busca por telefone: compara os últimos 8 dígitos
    -- (tolera DDD/código de país/formatação diferentes)
    IF length(v_digits) < 8 THEN
      RETURN;
    END IF;
    RETURN QUERY
    UPDATE public.itineraries i
       SET user_id = auth.uid(),
           updated_at = now()
      FROM public.itinerary_answers a
     WHERE a.itinerary_id = i.id
       AND length(regexp_replace(coalesce(a.whatsapp, ''), '\D', '', 'g')) >= 8
       AND right(regexp_replace(a.whatsapp, '\D', '', 'g'), 8) = right(v_digits, 8)
    RETURNING i.id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_itineraries_by_contact(text) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_itineraries_by_contact(text) TO authenticated;

COMMENT ON FUNCTION public.claim_itineraries_by_contact(text) IS
'Reatribui ao usuário atual (anônimo) os roteiros cujo e-mail ou telefone da etapa 1 do wizard dá match com o contato informado. Retorna os ids encontrados.';
