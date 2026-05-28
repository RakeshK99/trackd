import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { TrackdUser } from './types';

interface AuthState {
  session: Session | null;
  user: TrackdUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<TrackdUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser(uid: string) {
    const { data } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
    setUser(data as TrackdUser | null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadUser(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) loadUser(sess.user.id);
      else setUser(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        session,
        user,
        loading,
        refreshUser: () => (session ? loadUser(session.user.id) : Promise.resolve()),
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
