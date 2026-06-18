/**
 * useBadges — Badge & XP Award System
 *
 * Fetches badge definitions and user-earned badges from Supabase.
 * Provides a checkAndAwardBadge function to evaluate and award badges
 * based on user actions (quiz completion, level up, streak, diagnosis).
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/types/supabase';

type SupabaseFrom = ReturnType<SupabaseClient<Database>['from']>;

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at?: string;
}

export interface UseBadgesReturn {
  badges: Badge[];
  loading: boolean;
  checkAndAwardBadge: (type: string, value: number) => Promise<void>;
}

/**
 * Hook to manage badges: fetch definitions, track earned state,
 * and award new badges when requirements are met.
 */
export function useBadges(): UseBadgesReturn {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    if (!supabase) {
      // When Supabase is not configured, show placeholder badges
      setBadges([
        { id: '1', name: 'Primer Quiz', description: 'Completa tu primer quiz', icon: '🎯', earned: false },
        { id: '2', name: 'Estudiante Dedicated', description: 'Completa 5 quizzes', icon: '📚', earned: false },
        { id: '3', name: 'Sube de Nivel', description: 'Alcanza el nivel 2 en cualquier especialidad', icon: '⬆️', earned: false },
        { id: '4', name: 'Racha Inicial', description: 'Mantén una racha de 3 días', icon: '🔥', earned: false },
        { id: '5', name: 'Diagnóstico Inicial', description: 'Realiza tu primer diagnóstico', icon: '🔬', earned: false },
      ]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchBadges() {
      try {
        // Fetch all badge definitions
        const { data: badgeDefs, error: defsError } = await supabase!
          .from('badges')
          .select('*');

        if (defsError) {
          console.warn('Failed to fetch badges:', defsError.message);
          setLoading(false);
          return;
        }

        // Fetch user's earned badges
        const { data: earnedBadges, error: earnedError } = await supabase!
          .from('user_badges')
          .select('badge_id, earned_at');

        if (earnedError) {
          console.warn('Failed to fetch earned badges:', earnedError.message);
          setLoading(false);
          return;
        }

        // Build a set of earned badge IDs for quick lookup
        const earnedSet = new Set((earnedBadges ?? []).map((eb: { badge_id: string; earned_at: string }) => eb.badge_id));
        const earnedMap = new Map((earnedBadges ?? []).map((eb: { badge_id: string; earned_at: string }) => [eb.badge_id, eb.earned_at]));

        if (!cancelled) {
          const merged: Badge[] = (badgeDefs ?? []).map((bd: { id: string; name: string; description: string; icon: string }) => ({
            id: bd.id,
            name: bd.name,
            description: bd.description,
            icon: bd.icon,
            earned: earnedSet.has(bd.id),
            earned_at: earnedMap.get(bd.id),
          }));
          setBadges(merged);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBadges();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Check if a badge should be awarded based on action type and value.
   * If a matching badge exists and hasn't been earned yet, insert it.
   */
  const checkAndAwardBadge = useCallback(async (type: string, value: number): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // Find badges matching this requirement type and value threshold
      const matchingBadges = badges.filter(
        (b) => !b.earned && b.name !== '' // We'll check requirement_type/value from DB
      );

      // Fetch the actual badge definitions to check requirement_type/value
      const { data: defs, error: defsError } = await (supabase
        .from('badges') as unknown as SupabaseFrom)
        .select('id, requirement_type, requirement_value')
        .eq('requirement_type', type)
        .lte('requirement_value', value);

      if (defsError || !defs) return;

      // For each qualifying badge, insert a user_badge row
      for (const badgeDef of defs as Array<{ id: string; requirement_type: string; requirement_value: number }>) {
        const alreadyEarned = badges.find((b) => b.id === badgeDef.id)?.earned;
        if (alreadyEarned) continue;

        const { error: insertError } = await (supabase
          .from('user_badges') as unknown as SupabaseFrom)
          .insert({ profile_id: (await supabase.auth.getUser()).data.user?.id ?? '', badge_id: badgeDef.id });

        if (insertError) {
          // Ignore duplicate key errors (already earned)
          if (!insertError.message.includes('duplicate')) {
            console.warn('Failed to award badge:', insertError.message);
          }
        } else {
          // Optimistically update local state
          setBadges((prev) =>
            prev.map((b) =>
              b.id === badgeDef.id ? { ...b, earned: true, earned_at: new Date().toISOString() } : b
            )
          );
        }
      }
    } catch {
      // Silently fail — badge awarding is non-critical
    }
  }, [badges]);

  return { badges, loading, checkAndAwardBadge };
}

export default useBadges;
