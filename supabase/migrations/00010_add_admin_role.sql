-- ============================================================
-- Migration 00010: Role de admin + extensão da tabela profiles
-- ============================================================

-- Adicionar coluna is_admin na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Função utilitária para promover usuário a admin (executar manualmente no Supabase SQL editor)
-- USAGE: SELECT public.set_admin('email@example.com');
CREATE OR REPLACE FUNCTION public.set_admin(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RETURN 'Usuário não encontrado: ' || p_email;
  END IF;
  UPDATE public.profiles SET is_admin = true WHERE id = v_user_id;
  RETURN 'OK: ' || p_email || ' agora é admin.';
END;
$$;

COMMENT ON COLUMN public.profiles.is_admin IS 'true = usuário tem acesso ao painel administrativo /admin';
COMMENT ON FUNCTION public.set_admin IS 'Promove um usuário a admin pelo email. Executar no SQL editor do Supabase.';
