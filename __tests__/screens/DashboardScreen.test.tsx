import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DashboardScreen from '@/app/(tabs)/index';

jest.mock('@/src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'dra.garcia@unerg.edu.ve' },
    profile: { full_name: 'Dra. García', streak_count: 5 },
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  }),
}));

jest.mock('@/src/hooks/useProgress', () => ({
  useProgress: () => ({
    specialties: [
      { id: 's1', slug: 'operatoria-dental', name: 'Operatoria Dental', icon: '🦷', currentLevel: 1, totalLevels: 3, status: 'active', progress: 0 },
      { id: 's2', slug: 'endodoncia', name: 'Endodoncia', icon: '🔬', currentLevel: 1, totalLevels: 3, status: 'locked', progress: 0 },
    ],
    loading: false,
    error: false,
    reload: jest.fn(),
    completeLevel: jest.fn(),
    getProgress: () => 0,
    getXP: () => 240,
    completedQuizCount: 1,
  }),
}));

jest.mock('@/src/hooks/useBadges', () => ({
  useBadges: () => ({
    badges: [{ id: 'b1', name: 'Primer Quiz', description: 'Completa tu primer quiz', icon: '🎯', earned: true }],
    loading: false,
    checkAndAwardBadge: jest.fn(),
  }),
}));

jest.mock('@/src/services/activity', () => ({
  recordStudyActivity: jest.fn(async () => 5),
}));

describe('DashboardScreen', () => {
  it('should render a welcome title', () => {
    render(<DashboardScreen />);
    const elements = screen.getAllByText(/hola|bienvenido|hello|dashboard/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should render a Streak metric card', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('metric-streak')).toBeTruthy();
  });

  it('should render an XP metric card', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('metric-xp')).toBeTruthy();
  });

  it('should render the streak value with testID "streak-value"', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('streak-value')).toBeTruthy();
  });

  it('should render the XP value with testID "xp-value"', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('xp-value')).toBeTruthy();
  });

  it('should render a Learning Path section with testID "learning-path"', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('learning-path')).toBeTruthy();
  });

  it('should render a "next-level" button', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('next-level')).toBeTruthy();
  });
});
