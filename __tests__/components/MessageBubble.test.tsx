import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MessageBubble from '@/components/MessageBubble';

describe('MessageBubble', () => {
  it('should render the message text', () => {
    render(<MessageBubble text="Hello, how can I help?" role="assistant" />);
    expect(screen.getByText('Hello, how can I help?')).toBeTruthy();
  });

  it('should align right when role is user', () => {
    render(<MessageBubble text="My tooth hurts" role="user" />);
    const bubble = screen.getByTestId('bubble-user');
    expect(bubble).toBeTruthy();
  });

  it('should align left when role is assistant', () => {
    render(<MessageBubble text="Let me check" role="assistant" />);
    const bubble = screen.getByTestId('bubble-assistant');
    expect(bubble).toBeTruthy();
  });

  it('should display timestamp when provided', () => {
    render(
      <MessageBubble
        text="Hello"
        role="assistant"
        timestamp="10:30 AM"
      />
    );
    expect(screen.getByText('10:30 AM')).toBeTruthy();
  });

  it('should show loading indicator when isLoading is true', () => {
    render(
      <MessageBubble text="" role="assistant" isLoading />
    );
    expect(screen.getByTestId('bubble-loading')).toBeTruthy();
  });

  it('should not show loading indicator when isLoading is false', () => {
    render(
      <MessageBubble text="Hello" role="assistant" isLoading={false} />
    );
    expect(screen.queryByTestId('bubble-loading')).toBeNull();
  });
});
