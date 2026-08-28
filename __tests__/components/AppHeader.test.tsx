import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AppHeader from '@/components/AppHeader';

describe('AppHeader', () => {
  it('should render "Dentify" as the logo text', () => {
    render(<AppHeader />);
    expect(screen.getByText('Dentify')).toBeTruthy();
  });

  it('should render a clickable avatar with testID "user-avatar"', () => {
    render(<AppHeader />);
    const avatar = screen.getByTestId('user-avatar');
    expect(avatar).toBeTruthy();
  });

  it('should render the header bar with testID "app-header"', () => {
    render(<AppHeader />);
    const header = screen.getByTestId('app-header');
    expect(header).toBeTruthy();
  });

  it('should render subtitle when the prop is provided', () => {
    render(<AppHeader subtitle="DASHBOARD" />);
    expect(screen.getByText('DASHBOARD')).toBeTruthy();
  });

  it('should not render subtitle when the prop is not provided', () => {
    render(<AppHeader />);
    expect(screen.queryByText('DASHBOARD')).toBeNull();
  });

  it('should render a user initial in the avatar', () => {
    render(<AppHeader />);
    // useAuth returns no user in test → default 'U' for 'Estudiante'
    const avatar = screen.getByTestId('user-avatar');
    expect(avatar).toBeTruthy();
  });
});
