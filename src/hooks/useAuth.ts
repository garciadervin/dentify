import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    if (!supabase) {
      // Defer setting loading to false so the initial render shows loading=true
      // This is important for tests that check initial state
      const id = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(id);
    }

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const supabase = getSupabase();
      if (!supabase) {
        return { error: 'Supabase no está configurado' };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error: error?.message ?? null };
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const supabase = getSupabase();
      if (!supabase) {
        return { error: 'Supabase no está configurado' };
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      return { error: error?.message ?? null };
    },
    []
  );

  return { user, session, loading, signIn, signUp };
}

export default useAuth;
