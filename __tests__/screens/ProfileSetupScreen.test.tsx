import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileSetupScreen from '@/app/auth/profile-setup';

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

// Mock supabase so profile save succeeds
jest.mock('@/src/lib/supabase', () => ({
  getSupabase: jest.fn(() => ({
    auth: {
      signUp: jest.fn(async () => ({ data: { user: {} }, error: null })),
      signInWithPassword: jest.fn(async () => ({ data: { user: {} }, error: null })),
      signOut: jest.fn(async () => ({ error: null })),
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      insert: jest.fn(async () => ({ error: null })),
      upsert: jest.fn(async () => ({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ single: jest.fn(async () => ({ data: null, error: null })) })),
      })),
    })),
  })),
}));

// Mock useAuth
jest.mock('@/src/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user', email: 'test@example.com' },
    session: null,
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
  })),
}));

describe('ProfileSetupScreen', () => {
  it('should render a full name TextInput with testID "fullname-input"', () => {
    render(<ProfileSetupScreen />);
    expect(screen.getByTestId('fullname-input')).toBeTruthy();
  });

  it('should render a student ID TextInput with testID "student-id-input"', () => {
    render(<ProfileSetupScreen />);
    expect(screen.getByTestId('student-id-input')).toBeTruthy();
  });

  it('should render a save profile button with testID "save-profile-button"', () => {
    render(<ProfileSetupScreen />);
    const button = screen.getByTestId('save-profile-button');
    expect(button).toBeTruthy();
    expect(screen.getByText('Guardar perfil')).toBeTruthy();
  });

  it('should navigate to dashboard when profile is saved', async () => {
    mockReplace.mockClear();

    render(<ProfileSetupScreen />);

    const fullnameInput = screen.getByTestId('fullname-input');
    const studentIdInput = screen.getByTestId('student-id-input');
    const saveButton = screen.getByTestId('save-profile-button');

    fireEvent.changeText(fullnameInput, 'Dr. Juan Pérez');
    fireEvent.changeText(studentIdInput, 'STU-2024-001');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
