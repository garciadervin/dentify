import { renderHook, act, waitFor } from '@testing-library/react-native';
import useBadges from '@/src/hooks/useBadges';

const badgeDefs = [
  {
    id: 'b-quiz', name: 'Primer Quiz', description: 'Completa tu primer quiz', icon: '🎯',
    requirement_type: 'quiz_complete', requirement_value: 1,
  },
  {
    id: 'b-streak', name: 'Racha de 3', description: '3 días seguidos', icon: '🔥',
    requirement_type: 'streak', requirement_value: 3,
  },
];

function makeClient({
  earned = [] as any[],
  awardDefs = badgeDefs,
  insertError = null as { message: string } | null,
} = {}) {
  const insert = jest.fn(() => Promise.resolve({ error: insertError as { message: string } | null }));
  const from = jest.fn((table: string) => {
    if (table === 'badges') {
      const chain: any = {};
      chain.select = jest.fn((cols?: string) => {
        // Initial definitions load uses select('*'); awards use a filtered chain.
        if (cols === '*') return Promise.resolve({ data: badgeDefs, error: null });
        const filtered: any = {};
        filtered.eq = jest.fn(() => filtered);
        filtered.lte = jest.fn(() => Promise.resolve({ data: awardDefs, error: null }));
        return filtered;
      });
      return chain;
    }
    if (table === 'user_badges') {
      return {
        select: jest.fn(() => Promise.resolve({ data: earned, error: null })),
        insert,
      };
    }
    return { select: jest.fn(() => Promise.resolve({ data: [], error: null })) };
  });
  return {
    from,
    insert,
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })) },
  };
}

jest.mock('@/src/lib/supabase', () => ({
  getSupabase: jest.fn(),
}));

describe('useBadges', () => {
  afterEach(() => jest.clearAllMocks());

  it('merges earned badges into the definitions on load', async () => {
    const client = makeClient({ earned: [{ badge_id: 'b-quiz', earned_at: '2026-01-01T00:00:00Z' }] });
    (require('@/src/lib/supabase').getSupabase as jest.Mock).mockReturnValue(client);

    const { result } = renderHook(() => useBadges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const quiz = result.current.badges.find((b) => b.id === 'b-quiz');
    const streak = result.current.badges.find((b) => b.id === 'b-streak');
    expect(quiz?.earned).toBe(true);
    expect(streak?.earned).toBe(false);
  });

  it('awards only qualifying badges the user does not already own', async () => {
    // Real query filters by requirement_type + value; here we simulate the result
    // (only b-quiz qualifies) and show the already-earned one is skipped.
    const client = makeClient({
      earned: [{ badge_id: 'b-quiz', earned_at: '2026-01-01T00:00:00Z' }],
      awardDefs: [badgeDefs[0]],
    });
    (require('@/src/lib/supabase').getSupabase as jest.Mock).mockReturnValue(client);

    const { result } = renderHook(() => useBadges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.checkAndAwardBadge('quiz_complete', 1);
    });

    // b-quiz already earned → skipped; nothing to insert.
    expect(client.insert).not.toHaveBeenCalled();
  });

  it('inserts a new badge and marks it earned optimistically', async () => {
    const client = makeClient();
    (require('@/src/lib/supabase').getSupabase as jest.Mock).mockReturnValue(client);

    const { result } = renderHook(() => useBadges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.checkAndAwardBadge('streak', 5);
    });

    expect(client.insert).toHaveBeenCalledWith({ profile_id: 'u1', badge_id: 'b-streak' });
    const streak = result.current.badges.find((b) => b.id === 'b-streak');
    expect(streak?.earned).toBe(true);
  });

  it('ignores duplicate-key insert errors (already awarded concurrently)', async () => {
    const client = makeClient({ insertError: { message: 'duplicate key value violates unique constraint' } });
    (require('@/src/lib/supabase').getSupabase as jest.Mock).mockReturnValue(client);

    const { result } = renderHook(() => useBadges());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.checkAndAwardBadge('streak', 5)).resolves.toBeUndefined();
    });
    const streak = result.current.badges.find((b) => b.id === 'b-streak');
    expect(streak?.earned).toBe(false);
  });
});
