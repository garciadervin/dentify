import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AppHeader from '@/components/AppHeader';

describe('AppHeader', () => {
  it('should render "Dentify" as the logo text', () => {
    render(<AppHeader />);
    expect(screen.getByText('Dentify')).toBeTruthy();
  });

  it('should render a circular avatar with testID "user-avatar"', () => {
    render(<AppHeader />);
    const avatar = screen.getByTestId('user-avatar');
    expect(avatar).toBeTruthy();
  });

  it('should have a height of 64px', () => {
    render(<AppHeader />);
    // The header container should have a style with height: 64
    // We look for the outermost View that acts as the header container
    const header = screen.getByTestId('app-header');
    expect(header).toHaveStyle({ height: 64 });
  });

  it('should render subtitle when the prop is provided', () => {
    render(<AppHeader subtitle="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('should render description when the prop is provided', () => {
    render(<AppHeader description="Your daily overview" />);
    expect(screen.getByText('Your daily overview')).toBeTruthy();
  });

  it('should not render subtitle when the prop is not provided', () => {
    render(<AppHeader />);
    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('should not render description when the prop is not provided', () => {
    render(<AppHeader />);
    expect(screen.queryByText('Your daily overview')).toBeNull();
  });
});
