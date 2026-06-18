import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/types/supabase';

type SupabaseFrom = ReturnType<SupabaseClient<Database>['from']>;

type ProgressRow = Database['public']['Tables']['pedagogical_progress']['Row'];

export interface Specialty {
  id: string;
  name: string;
  icon: string;
  currentLevel: number;
  totalLevels: number;
  status: 'locked' | 'active' | 'completed';
}

export interface UseProgressReturn {
  specialties: Specialty[];
  currentLevel: number;
  loading: boolean;
  completeLevel: (specialty: string, level: number) => Promise<void>;
  getProgress: (specialty: string) => number;
}

/**
 * Hook to manage student progress across dental specialties.
 * Fetches pedagogical_progress from Supabase and provides helpers
 * to complete levels and compute progress percentages.
 */
export function useProgress(): UseProgressReturn {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    if (!supabase) {
      // Defer setting loading to false so the initial render shows loading=true
      // This is important for tests that check initial state
      const id = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(id);
    }

    // Fetch progress from Supabase
    supabase
      .from('pedagogical_progress')
      .select('*')
      .then(({ data, error }) => {
        if (error) {
          console.warn('Failed to fetch pedagogical progress:', error.message);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          // Group by specialty to build Specialty objects
          const specialtyMap = new Map<string, Specialty>();
          const rows = data as unknown as ProgressRow[];

          for (const row of rows) {
            const existing = specialtyMap.get(row.specialty);
            if (!existing || row.level > existing.currentLevel) {
              specialtyMap.set(row.specialty, {
                id: row.id,
                name: row.specialty,
                icon: getIconForSpecialty(row.specialty),
                currentLevel: row.level,
                totalLevels: 5, // Default total levels per specialty
                status: row.status,
              });
            }
          }

          const fetchedSpecialties = Array.from(specialtyMap.values());

          // Determine current level from the highest active level across specialties
          const highestActive = fetchedSpecialties.reduce(
            (max, s) => (s.status === 'active' && s.currentLevel > max ? s.currentLevel : max),
            0
          );
          const highestCompleted = fetchedSpecialties.reduce(
            (max, s) => (s.status === 'completed' && s.currentLevel > max ? s.currentLevel : max),
            0
          );

          setSpecialties(fetchedSpecialties);
          setCurrentLevel(Math.max(highestActive, highestCompleted + 1, 1));
        }

        setLoading(false);
      });
  }, []);

  /**
   * Mark a level as completed for a given specialty in Supabase.
   */
  const completeLevel = useCallback(async (specialty: string, level: number): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) {
      console.warn('completeLevel: Supabase not available');
      return;
    }

    const { error } = await (supabase
      .from('pedagogical_progress') as unknown as SupabaseFrom)
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('specialty', specialty)
      .eq('level', level);

    if (error) {
      console.warn('Failed to complete level:', error.message);
      return;
    }

    // Optimistically update local state
    setSpecialties((prev) =>
      prev.map((s) =>
        s.name === specialty && s.currentLevel === level
          ? { ...s, status: 'completed' as const }
          : s
      )
    );
    setCurrentLevel((prev) => Math.max(prev, level + 1));
  }, []);

  /**
   * Returns the progress percentage for a given specialty.
   * Computed as (completed levels / total levels) * 100.
   */
  const getProgress = useCallback(
    (specialty?: string): number => {
      if (!specialty) return 0;
      const found = specialties.find((s) => s.name === specialty);
      if (!found) return 0;
      return Math.round((found.currentLevel / found.totalLevels) * 100);
    },
    [specialties]
  );

  return { specialties, currentLevel, loading, completeLevel, getProgress };
}

/**
 * Map specialty names to icons for display.
 */
function getIconForSpecialty(specialty: string): string {
  const iconMap: Record<string, string> = {
    'Operatoria Dental': '🦷',
    Endodoncia: '🔬',
    Periodoncia: '🫀',
    Ortodoncia: '😁',
    'Cirugía Oral': '🔪',
    Prostodoncia: '🦿',
    Odontopediatría: '👶',
    Radiología: '📡',
  };
  return iconMap[specialty] ?? '📚';
}

export default useProgress;
