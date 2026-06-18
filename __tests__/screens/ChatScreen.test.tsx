import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ChatScreen from '@/app/(tabs)/chat';

describe('ChatScreen', () => {
  it('should render a messages list', () => {
    render(<ChatScreen />);
    expect(screen.getByTestId('messages-list')).toBeTruthy();
  });

  it('should render ChatInput at the bottom', () => {
    render(<ChatScreen />);
    expect(screen.getByTestId('chat-input')).toBeTruthy();
  });

  it('should render "Denty-AI" as the title in AppHeader', () => {
    render(<ChatScreen />);
    expect(screen.getByText(/Denty-AI/i)).toBeTruthy();
  });

  it('should show a welcome message from the assistant at the start', () => {
    render(<ChatScreen />);
    expect(screen.getByTestId('bubble-assistant')).toBeTruthy();
  });
});
