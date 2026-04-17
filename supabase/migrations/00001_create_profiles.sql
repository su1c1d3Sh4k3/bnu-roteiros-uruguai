-- ============================================================
-- Migration 00001: Tabela profiles + trigger de criação automática
-- ============================================================
-- Extensão do auth.users para dados adicionais do cliente.
-- Um profile é criado automaticamente quando o usuário se registra.

CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       text        NOT NULL DEFAULT '',
  whatsapp   text        DEFAULT '',
  email      text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS (políticas serão criadas na migration 00007)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Função que cria o profile automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, whatsapp, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'whatsapp', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

-- Trigger: dispara após inserção em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE public.profiles IS 'Perfil estendido do cliente. Criado automaticamente via trigger no signup.';
