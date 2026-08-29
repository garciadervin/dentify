/**
 * quiz — carga de preguntas desde la tabla `questions` (seed en BD).
 */

import { getSupabase } from '@/src/lib/supabase';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  specialty: string;
  level: number;
}

/**
 * Convierte el nombre de especialidad al slug usado en la tabla `questions`.
 */
export function specialtyToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-');
}

export async function fetchQuizQuestions(
  specialtyName: string,
  level: number
): Promise<QuizQuestion[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let slug = specialtyToSlug(specialtyName);
  try {
    const { data: spec } = await supabase
      .from('specialties')
      .select('slug')
      .eq('name', specialtyName)
      .maybeSingle();
    if (spec?.slug) slug = spec.slug;
  } catch {
    // usa el slug derivado
  }

  try {
    const { data, error } = await supabase
      .from('questions')
      .select('id, question, options, correct_index, explanation, level')
      .eq('specialty_slug', slug)
      .eq('level', level)
      .order('created_at');
    if (error || !data) return [];
    return data.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options as unknown as string[],
      correctIndex: q.correct_index,
      explanation: q.explanation ?? '',
      specialty: specialtyName,
      level: q.level,
    }));
  } catch {
    return [];
  }
}
