import { renderHook, act, waitFor } from '@testing-library/react-native';
import useProgress from '@/src/hooks/useProgress';

const specialties = [
  {
    id: 's1', slug: 'operatoria-dental', name: 'Operatoria Dental', icon: '🦷', levels_count: 3,
    levels: [1, 2, 3].map((n) => ({ level_number: n, xp_reward: n * 100 })),
  },
  {
    id: 's2', slug: 'endodoncia', name: 'Endodoncia', icon: '🔬', levels_count: 3,
    levels: [1, 2, 3].map((n) => ({ level_number: n, xp_reward: n * 100 })),
  },
];

function makeSupabase(progressRows: any[]) {
  const upserts: any[] = [];
  const from = jest.fn((table: string) => {
    if (table === 'specialties') {
      const chain: any = {
        select: jest.fn(() => chain),
        order: jest.fn(() => Promise.resolve({ data: specialties, error: null })),
      };
      return chain;
    }
    return {
      select: jest.fn(() => Promise.resolve({ data: progressRows, error: null })),
      upsert: jest.fn((row: any) => {
        upserts.push(row);
        return Promise.resolve({ error: null });
      }),
    };
  });
  return {
    from,
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })) },
    upserts,
  };
}

jest.mock('@/src/lib/supabase', () => ({
  getSupabase: jest.fn(),
}));

describe('useProgress', () => {
  afterEach(() => jest.clearAllMocks());

  it('builds specialty status and progress from completed rows', async () => {
    const supabase = makeSupabase([
      { specialty: 'Operatoria Dental', level: 1, status: 'completed', completed_at: '2026-01-01' },
    ]);
    (require('@/src/lib/supabase').getSupabase as jest.Mock).mockReturnValue(supabase);

    const { result } = renderHook(() => useProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const op = result.current.specialties.find((s) => s.slug === 'operatoria-dental');
    const endo = result.current.specialties.find((s) => s.slug === 'endodoncia');
    expect(op?.status).toBe('active');
    expect(op?.currentLevel).toBe(2);
    expect(op?.progress).toBe(33);
    expect(endo?.status).toBe('locked');
  });

  it('marks a level completed and unlocks the next one', async () => {
    const supabase = makeSupabase([]);
    (require('@/src/lib/supabase').getSupabase as jest.Mock).mockReturnValue(supabase);

    const { result } = renderHook(() => useProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.completeLevel('Operatoria Dental', 1);
    });

    const completed = supabase.upserts.find((r: any) => r.level === 1);
    const unlocked = supabase.upserts.find((r: any) => r.level === 2);
    expect(completed?.status).toBe('completed');
    expect(unlocked?.status).toBe('active');
  });
});
