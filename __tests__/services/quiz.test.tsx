import {
  fetchQuizSession,
  fetchMistakes,
  recordAnswer,
  specialtyToSlug,
} from '@/src/services/quiz';
import * as supabaseLib from '@/src/lib/supabase';

// DB-shaped rows (question_type, case_id, ...) as returned by the `questions` table.
// Case text comes from the joined `clinical_cases` relationship (3NF).
function dbRows() {
  return [
    {
      id: 'a1', specialty_slug: 'operatoria-dental', level: 1, question_type: 'mcq',
      question: 'Indep 1', options: ['A', 'B', 'C', 'D'], correct_index: 0,
      correct_indexes: null, pairs: null, order_items: null, case_id: null, clinical_cases: null,
      hint: null, points: 10, difficulty: 1, explanation: 'ex', tags: ['t'],
    },
    {
      id: 'c1', specialty_slug: 'operatoria-dental', level: 3, question_type: 'case',
      question: 'Caso 1a', options: ['A', 'B', 'C', 'D'], correct_index: 1,
      correct_indexes: null, pairs: null, order_items: null, case_id: 'case-1', clinical_cases: { text: 'Paciente X' },
      hint: null, points: 10, difficulty: 3, explanation: 'ex', tags: ['t'],
    },
    {
      id: 'c2', specialty_slug: 'operatoria-dental', level: 3, question_type: 'case',
      question: 'Caso 1b', options: ['A', 'B', 'C', 'D'], correct_index: 2,
      correct_indexes: null, pairs: null, order_items: null, case_id: 'case-1', clinical_cases: { text: 'Paciente X' },
      hint: null, points: 10, difficulty: 3, explanation: 'ex', tags: ['t'],
    },
    {
      id: 'a2', specialty_slug: 'operatoria-dental', level: 2, question_type: 'match',
      question: 'Indep 2', options: null, correct_index: null, correct_indexes: null,
      pairs: [{ left: 'L1', right: 'R1' }, { left: 'L2', right: 'R2' }], order_items: null,
      case_id: null, clinical_cases: null, hint: null, points: 15, difficulty: 2, explanation: 'ex', tags: ['t'],
    },
    {
      id: 'a3', specialty_slug: 'operatoria-dental', level: 2, question_type: 'order',
      question: 'Indep 3', options: null, correct_index: null, correct_indexes: null, pairs: null,
      order_items: [{ text: 'A', position: 1 }, { text: 'B', position: 2 }, { text: 'C', position: 3 }],
      case_id: null, clinical_cases: null, hint: null, points: 15, difficulty: 2, explanation: 'ex', tags: ['t'],
    },
  ];
}

function mockSupabase({ questions = dbRows(), history = [] as any[] } = {}) {
  const from = jest.fn((table: string) => {
    let current: any[] = table === 'answer_history' ? history : questions;
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      in: jest.fn((_col: string, ids: string[]) => {
        current = current.filter((r: any) => ids.includes(r.id));
        return chain;
      }),
      order: jest.fn(() => Promise.resolve({ data: current, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: { slug: 'operatoria-dental' }, error: null })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      then: (resolve: any, reject: any) => Promise.resolve({ data: current, error: null }).then(resolve, reject),
    };
    return chain;
  });
  return {
    from,
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
  };
}

describe('quiz service', () => {
  afterEach(() => jest.restoreAllMocks());

  it('specialtyToSlug normalizes accents and spaces', () => {
    expect(specialtyToSlug('Anatomía Dental')).toBe('anatomia-dental');
    expect(specialtyToSlug('Operatoria Dental')).toBe('operatoria-dental');
  });

  it('fetchQuizSession keeps case sub-questions grouped together', async () => {
    jest.spyOn(supabaseLib, 'getSupabase').mockReturnValue(mockSupabase() as any);
    const session = await fetchQuizSession('Operatoria Dental', 3, 100);
    const caseIds = session.filter((q) => q.caseId === 'case-1');
    expect(caseIds).toHaveLength(2);
    const idx = session.findIndex((q) => q.caseId === 'case-1');
    expect(session[idx + 1]?.caseId).toBe('case-1');
    // Case text is mapped from the joined clinical_cases row.
    expect(session[idx]?.caseText).toBe('Paciente X');
  });

  it('fetchQuizSession respects the count for non-case pools', async () => {
    const onlyNonCase = dbRows().filter((q) => !q.case_id);
    jest.spyOn(supabaseLib, 'getSupabase').mockReturnValue(
      mockSupabase({ questions: onlyNonCase }) as any
    );
    const session = await fetchQuizSession('Operatoria Dental', 2, 2);
    expect(session.length).toBeLessThanOrEqual(2);
  });

  it('recordAnswer inserts the answer scoped to the current user', async () => {
    const client = mockSupabase();
    jest.spyOn(supabaseLib, 'getSupabase').mockReturnValue(client as any);
    await recordAnswer('q1', true);
    const lastResult = client.from.mock.results.at(-1)?.value;
    const insertPayload = lastResult.insert.mock.calls[0][0];
    expect(insertPayload).toEqual({ profile_id: 'user-1', question_id: 'q1', correct: true });
  });

  it('fetchMistakes returns only questions whose latest answer was wrong', async () => {
    // Already ordered desc by answered_at, as the real `.order()` returns.
    const history = [
      { question_id: 'a2', correct: false, answered_at: '2026-08-30T12:00:00Z' },
      { question_id: 'a1', correct: true, answered_at: '2026-08-30T11:00:00Z' },
      { question_id: 'a1', correct: false, answered_at: '2026-08-30T10:00:00Z' },
    ];
    jest.spyOn(supabaseLib, 'getSupabase').mockReturnValue(
      mockSupabase({ history }) as any
    );
    const mistakes = await fetchMistakes('Operatoria Dental', 1);
    // a1 latest answer is correct → excluded; a2 latest is wrong → included.
    expect(mistakes.some((m) => m.id === 'a1')).toBe(false);
    expect(mistakes.some((m) => m.id === 'a2')).toBe(true);
  });
});
