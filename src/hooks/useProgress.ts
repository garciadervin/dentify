import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '@/src/lib/supabase';

export interface Specialty {
  id: string;
  slug: string;
  name: string;
  icon: string;
  currentLevel: number;
  totalLevels: number;
  status: 'locked' | 'active' | 'completed';
  /** Percentage of completed levels for the specialty (0–100). */
  progress: number;
}

interface SpecialtyDef {
  id: string;
  slug: string;
  name: string;
  icon: string;
  levels_count: number;
  levels: { level_number: number; xp_reward: number }[];
}

interface ProgressRow {
  specialty: string;
  level: number;
  status: string;
  completed_at: string | null;
}

export interface UseProgressReturn {
  specialties: Specialty[];
  currentLevel: number;
  loading: boolean;
  completeLevel: (specialty: string, level: number) => Promise<boolean>;
  getProgress: (specialty: string) => number;
  getXP: () => number;
  completedQuizCount: number;
}

function buildSpecialties(defs: SpecialtyDef[], rows: ProgressRow[]): Specialty[] {
  const isDone = (def: SpecialtyDef) => {
    const done = rows.filter(
      (r) => r.specialty === def.name && r.status === 'completed'
    );
    return done.length >= def.levels_count;
  };

  const anyActive = defs.find((d) =>
    rows.some((r) => r.specialty === d.name && r.status === 'active')
  );
  const firstNotDone = defs.find((d) => !isDone(d));
  const activeDef = anyActive ?? firstNotDone;

  return defs.map((def) => {
    const completed = rows.filter(
      (r) => r.specialty === def.name && r.status === 'completed'
    );
    const active = rows.filter((r) => r.specialty === def.name && r.status === 'active');
    const highestCompleted = completed.reduce((m, r) => Math.max(m, r.level), 0);
    const activeLevel = active.length
      ? Math.min(...active.map((r) => r.level))
      : null;

    const total = def.levels_count || 3;
    const done = highestCompleted >= total;
    const status: Specialty['status'] = done
      ? 'completed'
      : def === activeDef
        ? 'active'
        : 'locked';

    return {
      id: def.id,
      slug: def.slug,
      name: def.name,
      icon: def.icon,
      currentLevel: activeLevel ?? highestCompleted + 1,
      totalLevels: total,
      status,
      progress: Math.round((highestCompleted / total) * 100),
    };
  });
}

export function useProgress(): UseProgressReturn {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const defsRef = useRef<SpecialtyDef[]>([]);
  const rowsRef = useRef<ProgressRow[]>([]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      // Defer setting loading to false so the initial render shows loading=true
      const id = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(id);
    }

    let cancelled = false;
    const client = supabase;

    async function load() {
      try {
        const [{ data: defs, error: defsError }, { data: rows, error: rowsError }] =
          await Promise.all([
            client
              .from('specialties')
              .select('id, slug, name, icon, levels_count, levels(level_number, xp_reward)')
              .order('order_index'),
            client
              .from('pedagogical_progress')
              .select('specialty, level, status, completed_at'),
          ]);

        if (cancelled) return;
        if (defsError || rowsError) {
          console.warn('useProgress: no se pudieron cargar especialidades/progreso');
          setLoading(false);
          return;
        }

        defsRef.current = (defs ?? []) as unknown as SpecialtyDef[];
        rowsRef.current = (rows ?? []) as unknown as ProgressRow[];
        setSpecialties(buildSpecialties(defsRef.current, rowsRef.current));
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Marks a level as completed: UPSERTs progress, activates the next level (or
   * the next specialty) and refreshes local state.
   * Returns true when persisted.
   */
  const completeLevel = useCallback(async (specialty: string, level: number): Promise<boolean> => {
    const supabase = getSupabase();
    if (!supabase) return false;
    const client = supabase;
    const { data: userData } = await client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return false;

    const now = new Date().toISOString();

    const upsertRow = async (
      spec: string,
      lvl: number,
      status: 'locked' | 'active' | 'completed',
      completedAt?: string
    ) => {
      const { error } = await client
        .from('pedagogical_progress')
        .upsert(
          {
            profile_id: userId,
            specialty: spec,
            level: lvl,
            status,
            completed_at: completedAt ?? null,
          },
          { onConflict: 'profile_id,specialty,level' }
        );
      return !error;
    };

    const ok = await upsertRow(specialty, level, 'completed', now);
    if (!ok) return false;

    // Activate the next level or the next specialty.
    const def = defsRef.current.find((d) => d.name === specialty);
    if (def && level < def.levels_count) {
      await upsertRow(specialty, level + 1, 'active');
    } else if (def) {
      const idx = defsRef.current.findIndex((d) => d.id === def.id);
      const next = defsRef.current[idx + 1];
      if (next) await upsertRow(next.name, 1, 'active');
    }

    // Refresh local state from the last view of rows.
    const target = rowsRef.current.find(
      (r) => r.specialty === specialty && r.level === level
    );
    if (target) target.status = 'completed';
    else rowsRef.current.push({ specialty, level, status: 'completed', completed_at: now });

    setSpecialties(buildSpecialties(defsRef.current, rowsRef.current));
    return true;
  }, []);

  const getProgress = useCallback(
    (name?: string): number => {
      if (!name) return 0;
      return specialties.find((s) => s.name === name)?.progress ?? 0;
    },
    [specialties]
  );

  const getXP = useCallback((): number => {
    const defs = defsRef.current;
    return rowsRef.current
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => {
        const def = defs.find((d) => d.name === r.specialty);
        const lvl = def?.levels.find((l) => l.level_number === r.level);
        return sum + (lvl?.xp_reward ?? 0);
      }, 0);
  }, []);

  const completedQuizCount = rowsRef.current.filter((r) => r.status === 'completed').length;
  const active = specialties.find((s) => s.status === 'active');
  const currentLevel = active?.currentLevel ?? 1;

  return {
    specialties,
    currentLevel,
    loading,
    completeLevel,
    getProgress,
    getXP,
    completedQuizCount,
  };
}

export default useProgress;
