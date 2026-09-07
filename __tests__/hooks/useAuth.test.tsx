import { renderHook, act, waitFor } from '@testing-library/react-native';
import useAuth from '@/src/hooks/useAuth';

const mockAuth = {
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  getUser: jest.fn(),
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('@/src/lib/supabase', () => ({
  getSupabase: jest.fn(() => ({ auth: mockAuth, from: jest.fn() })),
}));

// Chainable .from('profiles') mock; profileData is the row (or null).
function mockProfileQuery(profileData: unknown) {
  const select = jest.fn(() => ({
    eq: jest.fn(() => ({
      maybeSingle: jest.fn(async () => ({ data: profileData, error: null })),
    })),
  }));
  const getSupabase = require('@/src/lib/supabase').getSupabase as jest.Mock;
  getSupabase.mockReturnValue({ auth: mockAuth, from: jest.fn(() => ({ select })) });
  return select;
}

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAuth.signOut.mockResolvedValue({ error: null });
    mockAuth.onAuthStateChange.mockImplementation(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }));
  });

  it('returns a signed-out state when there is no session', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.profileLoaded).toBe(true);
  });

  it('loads the user and their profile when a session exists', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: {
        session: { user: { id: 'u1', email: 'a@b.com' } },
        error: null,
      },
    });
    mockProfileQuery({
      full_name: 'Dra. García', avatar_color: null, role: 'student', student_id: 'S1', streak_count: 3,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.profileLoaded).toBe(true));
    expect(result.current.user?.id).toBe('u1');
    expect(result.current.profile?.full_name).toBe('Dra. García');
    expect(result.current.profile?.streak_count).toBe(3);
  });

  it('signIn returns the auth error message on failure', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderHook(() => useAuth());
    let outcome: { error: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.signIn('a@b.com', 'wrong');
    });
    expect(outcome?.error).toBe('Invalid login credentials');
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'wrong' });
  });

  it('signIn returns null error on success', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' }, session: {} },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    let outcome: { error: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.signIn('a@b.com', 'right');
    });
    expect(outcome?.error).toBeNull();
  });

  it('signUp always sends role=student and reports needsConfirmation when no session is returned', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    let outcome: { error: string | null; needsConfirmation?: boolean } | undefined;
    await act(async () => {
      // Teacher is requested but must be ignored: self-service signup is student.
      outcome = await result.current.signUp('a@b.com', 'secret', 'teacher');
    });
    expect(outcome?.error).toBeNull();
    expect(outcome?.needsConfirmation).toBe(true);
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
      options: { data: { role: 'student' } },
    });
  });

  it('signOut clears the session, user and profile', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: {
        session: { user: { id: 'u1', email: 'a@b.com' } },
        error: null,
      },
    });
    mockProfileQuery({
      full_name: 'Dra. García', avatar_color: null, role: 'student', student_id: 'S1', streak_count: 3,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.profileLoaded).toBe(true));
    expect(result.current.user?.id).toBe('u1');

    await act(async () => {
      await result.current.signOut();
    });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('a profiles query error leaves profileLoaded=false (guard must NOT bounce to profile setup)', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: {
        session: { user: { id: 'u1', email: 'a@b.com' } },
        error: null,
      },
    });
    // from('profiles') resolves with an error (offline/transient).
    const select = jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: jest.fn(async () => ({ data: null, error: { message: 'network error' } })),
      })),
    }));
    const getSupabase = require('@/src/lib/supabase').getSupabase as jest.Mock;
    getSupabase.mockReturnValue({ auth: mockAuth, from: jest.fn(() => ({ select })) });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profileLoaded).toBe(false);
    expect(result.current.profile).toBeNull();
  });
});
