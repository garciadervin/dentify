import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ChatInput from '@/components/ChatInput';

describe('ChatInput', () => {
  it('should render a TextInput for writing messages', () => {
    render(<ChatInput onSend={jest.fn()} />);
    expect(screen.getByTestId('chat-input')).toBeTruthy();
  });

  it('should render a send button', () => {
    render(<ChatInput onSend={jest.fn()} />);
    expect(screen.getByTestId('send-button')).toBeTruthy();
  });

  it('should render a voice button for microphone', () => {
    render(<ChatInput onSend={jest.fn()} />);
    expect(screen.getByTestId('voice-button')).toBeTruthy();
  });

  it('should not render an attach button (eliminado del diseño)', () => {
    render(<ChatInput onSend={jest.fn()} />);
    expect(screen.queryByTestId('attach-button')).toBeNull();
  });

  it('should not call onSend when pressing send with empty text', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} />);

    const sendButton = screen.getByTestId('send-button');
    fireEvent.press(sendButton);

    expect(onSend).not.toHaveBeenCalled();
  });

  it('should call onSend with the text when pressing send with text', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByTestId('chat-input');
    fireEvent.changeText(input, 'What is caries?');

    const sendButton = screen.getByTestId('send-button');
    fireEvent.press(sendButton);

    expect(onSend).toHaveBeenCalledWith('What is caries?');
  });
});
