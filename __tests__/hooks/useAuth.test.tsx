import { renderHook, act } from '@testing-library/react-native';
import useAuth from '@/src/hooks/useAuth';

// Mock the supabase module
jest.mock('@/src/lib/supabase', () => ({
  getSupabase: jest.fn(),
}));

describe('useAuth', () => {
  it('should return user as null when there is no session', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
  });

  it('should return session as null when there is no session', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.session).toBeNull();
  });

  it('should return loading as true initially', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
  });

  it('should have a signIn function that accepts email and password', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.signIn).toBeDefined();
    expect(typeof result.current.signIn).toBe('function');
    expect(result.current.signIn.length).toBe(2);
  });

  it('should have a signUp function that accepts email and password', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.signUp).toBeDefined();
    expect(typeof result.current.signUp).toBe('function');
    expect(result.current.signUp.length).toBe(2);
  });
});
