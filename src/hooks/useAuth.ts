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
  /** Whether the profile lookup has resolved (for route guards). */
  profileLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    role?: 'student' | 'teacher'
  ) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
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
      let data: unknown = null;
      // Right after sign-in the session can swap an instant later than the
      // request, so the lookup can briefly run as anon and return an empty
      // result — which must NOT be treated as "no profile" (that would bounce
      // the user to profile setup). Retry once only on an empty success; a real
      // query error still leaves profileLoaded=false (no bounce).
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await supabase
          .from('profiles')
          .select('full_name, avatar_color, role, student_id, streak_count')
          .eq('id', id)
          .maybeSingle();
        if (res.error) return;
        data = res.data;
        if (data) break;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 300));
      }
      setProfile((data as unknown as Profile) ?? null);
      setProfileLoaded(true);
    } catch {
      // transient failure — keep profileLoaded=false (see above)
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
        // Reset the "no profile" state from the signed-out mount: the guard
        // must not bounce to profile-setup using a stale (empty) profile while
        // the real lookup is still in flight.
        setProfile(null);
        setProfileLoaded(false);
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
    async (
      email: string,
      password: string,
      _role?: 'student' | 'teacher'
    ): Promise<{ error: string | null; needsConfirmation?: boolean }> => {
      const supabase = getSupabase();
      if (!supabase) {
        return { error: 'Supabase no está configurado' };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Security: a self-signed account is ALWAYS 'student'. Teacher access
        // grants visibility into every student's progress and PII, so it must
        // be provisioned by an admin (promoteToTeacher), never self-selected.
        // Role also lives in auth user_metadata so route guards can read it;
        // the profiles row is created separately on profile setup.
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
