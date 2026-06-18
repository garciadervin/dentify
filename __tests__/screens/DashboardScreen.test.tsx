import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DashboardScreen from '@/app/(tabs)/index';

describe('DashboardScreen', () => {
  it('should render a welcome title', () => {
    render(<DashboardScreen />);
    expect(screen.getByText(/welcome|hello|dashboard/i)).toBeTruthy();
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

  it('should render a "next-level" section or button with testID "next-level"', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('next-level')).toBeTruthy();
  });
});
