import { renderHook, act } from '@testing-library/react-native';
import useProgress from '@/src/hooks/useProgress';

// Mock the supabase module
jest.mock('@/src/lib/supabase', () => ({
  getSupabase: jest.fn(),
}));

describe('useProgress', () => {
  it('should return specialties as an empty array initially', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.specialties).toEqual([]);
  });

  it('should return currentLevel as 1 initially', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.currentLevel).toBe(1);
  });

  it('should return loading as true initially', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.loading).toBe(true);
  });

  it('should have a completeLevel function that accepts specialty and level', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.completeLevel).toBeDefined();
    expect(typeof result.current.completeLevel).toBe('function');
    expect(result.current.completeLevel.length).toBe(2);
  });

  it('should have a getProgress function that returns a percentage', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.getProgress).toBeDefined();
    expect(typeof result.current.getProgress).toBe('function');
    const progress = result.current.getProgress('operative');
    expect(typeof progress).toBe('number');
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  });
});
