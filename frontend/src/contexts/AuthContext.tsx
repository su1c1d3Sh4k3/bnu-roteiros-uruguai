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

async function fetchProfile(userId: string): Promise<{ nome: string; is_admin: boolean } | null> {
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
  // loading = true ONLY while we don't know the session state yet
  // profile fetch is separate and never blocks this
  const [loading, setLoading] = useState(true);
  const loginInProgress = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Max 4 seconds to determine session state.
    // If getSession() hangs (e.g. token refresh network call), we unblock after 4s.
    const sessionTimer = setTimeout(() => {
      if (mounted.current) {
        console.warn('[Auth] getSession() timeout — clearing session and unblocking');
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null);
        setLoading(false);
      }
    }, 4000);

    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        clearTimeout(sessionTimer);
        if (!mounted.current) return;

        setSession(s);
        setLoading(false); // ← unblock routing immediately

        // Load profile in background — never blocks loading
        if (s?.user) {
          fetchProfile(s.user.id).then(profile => {
            if (!mounted.current || !profile) return;
            setUserNome(profile.nome ?? '');
            setIsAdmin(profile.is_admin ?? false);
          });
        }
      })
      .catch(() => {
        clearTimeout(sessionTimer);
        if (!mounted.current) return;
        setSession(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // Skip SIGNED_IN during manual login — handled by login() directly
      if (event === 'SIGNED_IN' && loginInProgress.current) return;

      if (!s) {
        setSession(null);
        setUserNome('');
        setIsAdmin(false);
        return;
      }

      setSession(s);

      // Refresh profile on auth state changes (token refresh, etc.)
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        fetchProfile(s.user.id).then(profile => {
          if (!mounted.current || !profile) return;
          setUserNome(profile.nome ?? '');
          setIsAdmin(profile.is_admin ?? false);
        });
      }
    });

    return () => {
      mounted.current = false;
      clearTimeout(sessionTimer);
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
