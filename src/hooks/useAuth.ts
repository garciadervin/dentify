import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface Profile {
  full_name: string | null;
  avatar_color: string | null;
  role: string | null;
  student_id: string | null;
  streak_count: number | null;
}

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** Indica si ya se resolvió la consulta del perfil (para guards de ruta). */
  profileLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: (userId?: string) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (userId?: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    let id = userId;
    if (!id) {
      const { data } = await supabase.auth.getUser();
      id = data.user?.id;
    }
    if (!id) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_color, role, student_id, streak_count')
        .eq('id', id)
        .maybeSingle();
      setProfile((data as unknown as Profile) ?? null);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();

    if (!supabase) {
      // Defer setting loading to false so the initial render shows loading=true
      const id = setTimeout(() => {
        setLoading(false);
        setProfileLoaded(true);
      }, 0);
      return () => clearTimeout(id);
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (cancelled) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
      if (currentSession?.user) {
        void refreshProfile(currentSession.user.id);
      } else {
        setProfileLoaded(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      if (newSession?.user) {
        void refreshProfile(newSession.user.id);
      } else {
        setProfile(null);
        setProfileLoaded(true);
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [refreshProfile]);

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
    setProfile(null);
    setProfileLoaded(false);
  }, []);

  return { user, session, profile, profileLoaded, loading, signIn, signUp, signOut, refreshProfile };
}

export default useAuth;
