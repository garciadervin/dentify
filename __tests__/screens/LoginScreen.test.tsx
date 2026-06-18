import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LoginScreen from '@/app/auth/login';

// Mock expo-router
jest.mock('expo-router', () => {
  const { TouchableOpacity } = require('react-native');
  const mockReact = require('react');
  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    }),
    Link: ({ children, ...props }: any) =>
      mockReact.createElement(TouchableOpacity, props, children),
  };
});

describe('LoginScreen', () => {
  it('should render an email TextInput with testID "email-input"', () => {
    render(<LoginScreen />);
    expect(screen.getByTestId('email-input')).toBeTruthy();
  });

  it('should render a password TextInput with testID "password-input"', () => {
    render(<LoginScreen />);
    const passwordInput = screen.getByTestId('password-input');
    expect(passwordInput).toBeTruthy();
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('should render a login button with testID "login-button"', () => {
    render(<LoginScreen />);
    const button = screen.getByTestId('login-button');
    expect(button).toBeTruthy();
    expect(screen.getByText('Iniciar sesión')).toBeTruthy();
  });

  it('should render a link/button to go to register', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Crear cuenta')).toBeTruthy();
  });

  it('should show error "Completa todos los campos" when login is pressed with empty fields', () => {
    render(<LoginScreen />);
    const loginButton = screen.getByTestId('login-button');
    fireEvent.press(loginButton);
    expect(screen.getByText('Completa todos los campos')).toBeTruthy();
  });
});
