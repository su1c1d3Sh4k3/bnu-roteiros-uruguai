import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userNome: string;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null; isAdmin: boolean }>;
  signup: (email: string, password: string, metadata: { nome: string; whatsapp: string }) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(userId: string) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('nome, is_admin')
      .eq('id', userId)
      .single();
    return data as { nome: string; is_admin: boolean } | null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userNome, setUserNome] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const loginInProgress = useRef(false);

  useEffect(() => {
    let done = false;

    // Timeout de segurança: cobre getSession() + fetchProfile()
    // Se qualquer uma das duas travar, loading vira false em 5s
    const safetyTimer = setTimeout(() => {
      if (!done) {
        done = true;
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setLoading(false);
      }
    }, 5000);

    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (done) return;

        if (s?.user) {
          setSession(s);
          const profile = await fetchProfile(s.user.id);
          if (!done && profile) {
            setUserNome(profile.nome ?? '');
            setIsAdmin(profile.is_admin ?? false);
          }
        }
      } catch {
        // ignora — safetyTimer vai chamar setLoading(false)
      } finally {
        if (!done) {
          done = true;
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_IN' && loginInProgress.current) return;

      if (!s) {
        setSession(null);
        setUserNome('');
        setIsAdmin(false);
        return;
      }

      setSession(s);

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const profile = await fetchProfile(s.user.id);
        if (profile) {
          setUserNome(profile.nome ?? '');
          setIsAdmin(profile.is_admin ?? false);
        }
      }
    });

    return () => {
      done = true;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ error: string | null; isAdmin: boolean }> => {
    loginInProgress.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const msg = error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message;
        return { error: msg, isAdmin: false };
      }

      let adminFlag = false;
      if (data.session && data.user) {
        setSession(data.session);
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          setUserNome(profile.nome ?? '');
          adminFlag = profile.is_admin ?? false;
          setIsAdmin(adminFlag);
        }
      }

      return { error: null, isAdmin: adminFlag };
    } finally {
      loginInProgress.current = false;
    }
  };

  const signup = async (
    email: string,
    password: string,
    metadata: { nome: string; whatsapp: string }
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome: metadata.nome, whatsapp: metadata.whatsapp } },
    });
    if (error) {
      const msg = error.message.includes('already registered')
        ? 'Este e-mail já está cadastrado.'
        : error.message;
      return { error: msg };
    }
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserNome('');
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, userNome, isAdmin, loading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
