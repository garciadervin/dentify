import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '@/app/auth/register';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => {
  const { TouchableOpacity } = require('react-native');
  const mockReact = require('react');
  return {
    useRouter: jest.fn(() => ({
      push: mockPush,
      replace: mockReplace,
      back: mockBack,
    })),
    Link: ({ children, ...props }: any) =>
      mockReact.createElement(TouchableOpacity, props, children),
  };
});

// Mock useAuth to return successful signUp
jest.mock('@/src/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    session: null,
    loading: false,
    signIn: jest.fn(async () => ({ error: null })),
    signUp: jest.fn(async () => ({ error: null })),
  })),
}));

describe('RegisterScreen', () => {
  it('should render an email TextInput with testID "reg-email-input"', () => {
    render(<RegisterScreen />);
    expect(screen.getByTestId('reg-email-input')).toBeTruthy();
  });

  it('should render a password TextInput with testID "reg-password-input"', () => {
    render(<RegisterScreen />);
    expect(screen.getByTestId('reg-password-input')).toBeTruthy();
  });

  it('should render a confirm password TextInput with testID "reg-confirm-input"', () => {
    render(<RegisterScreen />);
    expect(screen.getByTestId('reg-confirm-input')).toBeTruthy();
  });

  it('should render a register button with testID "register-button"', () => {
    render(<RegisterScreen />);
    const button = screen.getByTestId('register-button');
    expect(button).toBeTruthy();
    expect(screen.getByText('Crear cuenta')).toBeTruthy();
  });

  it('should show error "Las contraseñas no coinciden" when passwords do not match', () => {
    render(<RegisterScreen />);

    const emailInput = screen.getByTestId('reg-email-input');
    const passwordInput = screen.getByTestId('reg-password-input');
    const confirmInput = screen.getByTestId('reg-confirm-input');
    const registerButton = screen.getByTestId('register-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmInput, 'differentPassword');
    fireEvent.press(registerButton);

    expect(screen.getByText('Las contraseñas no coinciden')).toBeTruthy();
  });

  it('should navigate to profile setup when registration is successful', async () => {
    mockPush.mockClear();

    render(<RegisterScreen />);

    const emailInput = screen.getByTestId('reg-email-input');
    const passwordInput = screen.getByTestId('reg-password-input');
    const confirmInput = screen.getByTestId('reg-confirm-input');
    const registerButton = screen.getByTestId('register-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmInput, 'password123');
    fireEvent.press(registerButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/profile-setup');
    });
  });
});
