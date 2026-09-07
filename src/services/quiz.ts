/**
 * quiz — question loading from the `questions` table (seeded in DB).
 *
 * Supports 7 types (Duolingo-style): mcq, true_false, fill_blank, multi_select,
 * match, order and case (clinical case with sub-questions). Sessions sample a
 * subset of the pool per specialty+level so every attempt differs and is replayable.
 */

import { getSupabase } from '@/src/lib/supabase';

export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'fill_blank'
  | 'multi_select'
  | 'match'
  | 'order'
  | 'case';

export interface MatchPair {
  left: string;
  right: string;
}

export interface OrderItem {
  text: string;
  position: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuestionType;
  /** mcq / true_false / fill_blank / multi_select */
  options: string[] | null;
  /** mcq / true_false / fill_blank */
  correctIndex: number | null;
  /** multi_select */
  correctIndexes: number[] | null;
  /** match */
  pairs: MatchPair[] | null;
  /** order */
  orderItems: OrderItem[] | null;
  /** case */
  caseId: string | null;
  caseText: string | null;
  hint: string | null;
  points: number;
  difficulty: number;
  explanation: string;
  specialty: string;
  level: number;
}

interface QuestionRow {
  id: string;
  level: number;
  question: string;
  options: unknown;
  correct_index: number | null;
  explanation: string | null;
  question_type: QuestionType;
  correct_indexes: number[] | null;
  pairs: unknown;
  order_items: unknown;
  case_id: string | null;
  hint: string | null;
  points: number;
  difficulty: number;
}

function mapRow(row: QuestionRow): QuizQuestion {
  return {
    id: row.id,
    question: row.question,
    type: row.question_type ?? 'mcq',
    options: Array.isArray(row.options) ? (row.options as string[]) : null,
    correctIndex: row.correct_index,
    correctIndexes: Array.isArray(row.correct_indexes) ? row.correct_indexes : null,
    pairs: Array.isArray(row.pairs)
      ? (row.pairs as MatchPair[])
      : null,
    orderItems: Array.isArray(row.order_items)
      ? (row.order_items as OrderItem[])
      : null,
    caseId: row.case_id,
    caseText: (row as { clinical_cases?: { text?: string | null } | null }).clinical_cases?.text ?? null,
    hint: row.hint,
    points: row.points ?? 10,
    difficulty: row.difficulty ?? 1,
    explanation: row.explanation ?? '',
    specialty: '',
    level: row.level,
  };
}

/** Resolves a specialty display name to its surrogate id (specialties.id). */
async function resolveSpecialtyId(specialtyName: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data: spec } = await supabase
      .from('specialties')
      .select('id')
      .eq('name', specialtyName)
      .maybeSingle();
    return spec?.id ?? null;
  } catch {
    return null;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Splits the pool into "blocks": each standalone question is one block and the
 * sub-questions of a clinical case (same case_id) form one indivisible block.
 * Grouping is position-independent so a case's sub-questions are kept together
 * even if they are not contiguous in the pool, without losing or duplicating
 * any question.
 */
function toBlocks(questions: QuizQuestion[]): QuizQuestion[][] {
  const blocks: QuizQuestion[][] = [];
  const groupedCases = new Set<string>();
  for (const q of questions) {
    if (!q.caseId) {
      blocks.push([q]);
    } else if (!groupedCases.has(q.caseId)) {
      const group = questions.filter((x) => x.caseId === q.caseId);
      group.forEach((g) => groupedCases.add(g.caseId!));
      blocks.push(group);
    }
  }
  return blocks;
}

/**
 * Returns every question in the pool (specialty + level), ordered.
 * Useful for full sessions or review.
 */
export async function fetchQuizQuestions(
  specialtyName: string,
  level: number
): Promise<QuizQuestion[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const specialtyId = await resolveSpecialtyId(specialtyName);
  if (!specialtyId) return [];
  try {
    const { data, error } = await supabase
      .from('questions')
      .select(
        'id, question, question_type, options, correct_index, correct_indexes, pairs, order_items, case_id, clinical_cases(text), hint, points, difficulty, explanation, level'
      )
      .eq('specialty_id', specialtyId)
      .eq('level', level)
      .order('created_at');
    if (error || !data) return [];
    return (data as unknown as QuestionRow[]).map((q) => ({ ...mapRow(q), specialty: specialtyName }));
  } catch {
    return [];
  }
}

/**
 * Builds a quiz session by sampling a subset of the pool (type mix),
 * keeping clinical case sub-questions grouped.
 */
export async function fetchQuizSession(
  specialtyName: string,
  level: number,
  count = 10
): Promise<QuizQuestion[]> {
  const pool = await fetchQuizQuestions(specialtyName, level);
  if (pool.length === 0) return [];

  const blocks = shuffle(toBlocks(pool));
  const session: QuizQuestion[] = [];
  for (const block of blocks) {
    if (session.length >= count) break;
    session.push(...block);
  }
  return session;
}

/**
 * Records an answer in `answer_history` (for "review mistakes" and analytics).
 */
export async function recordAnswer(questionId: string, correct: boolean): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getUser();
    const profileId = data.user?.id;
    if (!profileId) return;
    await supabase
      .from('answer_history')
      .insert({ profile_id: profileId, question_id: questionId, correct });
  } catch {
    // silent: history is optional
  }
}

/**
 * Returns the specialty/level questions whose LAST answer by the user
 * was wrong (for the "review mistakes" mode).
 */
export async function fetchMistakes(
  specialtyName: string,
  level: number
): Promise<QuizQuestion[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data: userData } = await supabase.auth.getUser();
    const profileId = userData.user?.id;
    if (!profileId) return [];

    const { data, error } = await supabase
      .from('answer_history')
      .select('question_id, correct, answered_at')
      .eq('profile_id', profileId)
      .order('answered_at', { ascending: false });
    if (error || !data) return [];

    // Last answer per question.
    const latest = new Map<string, boolean>();
    for (const row of data as { question_id: string; correct: boolean }[]) {
      if (!latest.has(row.question_id)) latest.set(row.question_id, row.correct);
    }
    const wrongIds = [...latest.entries()]
      .filter(([, correct]) => !correct)
      .map(([qid]) => qid);
    if (wrongIds.length === 0) return [];

    const specialtyId = await resolveSpecialtyId(specialtyName);
    if (!specialtyId) return [];
    const { data: qs, error: qErr } = await supabase
      .from('questions')
      .select(
        'id, question, question_type, options, correct_index, correct_indexes, pairs, order_items, case_id, clinical_cases(text), hint, points, difficulty, explanation, level'
      )
      .in('id', wrongIds)
      .eq('specialty_id', specialtyId)
      .eq('level', level);
    if (qErr || !qs) return [];
    return (qs as unknown as QuestionRow[]).map((q) => ({ ...mapRow(q), specialty: specialtyName }));
  } catch {
    return [];
  }
}
