import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
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

    let cancelled = false;

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (cancelled) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
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
    async (email: string, password: string): Promise<{ error: string | null; needsConfirmation?: boolean }> => {
      const supabase = getSupabase();
      if (!supabase) {
        return { error: 'Supabase no está configurado' };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Role lives in auth user_metadata so route guards can read it; the
        // profiles table row is created separately on profile setup.
        options: { data: { role: 'student' } },
      });

      // When email confirmation is enabled, signUp returns a user but no
      // session — the caller should ask the user to confirm before continuing.
      const needsConfirmation = Boolean(data?.user) && !data?.session;

      return { error: error?.message ?? null, needsConfirmation };
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  }, []);

  return { user, session, loading, signIn, signUp, signOut };
}

export default useAuth;
