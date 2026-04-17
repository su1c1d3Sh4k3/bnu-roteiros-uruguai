import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userNome: string;
  isAdmin: boolean;
  loading: boolean;
  profileLoaded: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, metadata: { nome: string; whatsapp: string }) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userNome, setUserNome] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        await loadUserProfile(s.user.id);
      } else {
        setProfileLoaded(true);
      }
      setLoading(false);
    }).catch(() => {
      setProfileLoaded(true);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) {
        await loadUserProfile(s.user.id);
      } else {
        setUserNome('');
        setIsAdmin(false);
        setProfileLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('nome, is_admin')
      .eq('id', userId)
      .single();
    if (data?.nome) setUserNome(data.nome);
    setIsAdmin(data?.is_admin ?? false);
    setProfileLoaded(true);
  };

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message === 'Invalid login credentials') {
        return { error: 'E-mail ou senha incorretos.' };
      }
      return { error: error.message };
    }
    if (data.session && data.user) {
      setSession(data.session);
      await loadUserProfile(data.user.id);
    }
    return { error: null };
  };

  const signup = async (
    email: string,
    password: string,
    metadata: { nome: string; whatsapp: string }
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: metadata.nome,
          whatsapp: metadata.whatsapp,
        },
      },
    });
    if (error) {
      if (error.message.includes('already registered')) {
        return { error: 'Este e-mail ja esta cadastrado.' };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserNome('');
    setIsAdmin(false);
    setProfileLoaded(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userNome,
        isAdmin,
        loading,
        profileLoaded,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
