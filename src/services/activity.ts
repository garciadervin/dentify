/**
 * activity — registro de actividad de estudio (racha real).
 *
 * Actualiza profiles.streak_count / last_active_at:
 * - misma fecha: no cambia la racha;
 * - ayer: incrementa la racha;
 * - hueco: reinicia a 1.
 * Devuelve el valor de racha actual para otorgar el badge correspondiente.
 */

import { getSupabase } from '@/src/lib/supabase';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export async function recordStudyActivity(userId?: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase || !userId) return 0;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('streak_count, last_active_at')
      .eq('id', userId)
      .maybeSingle();

    const today = dayKey(new Date());
    const last = data?.last_active_at ? new Date(data.last_active_at) : null;
    const lastKey = last ? dayKey(last) : null;

    let streak = data?.streak_count ?? 0;
    if (lastKey === today) {
      // Ya se contó actividad hoy.
    } else if (lastKey) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      streak = lastKey === dayKey(yesterday) ? streak + 1 : 1;
    } else {
      streak = 1;
    }

    await supabase
      .from('profiles')
      .update({ streak_count: streak, last_active_at: new Date().toISOString() })
      .eq('id', userId);

    return streak;
  } catch {
    return 0;
  }
}
