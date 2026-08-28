import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import QuizScreen from '@/app/quiz/[id]';

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useLocalSearchParams: jest.fn(() => ({ id: 'Operatoria Dental-1' })),
    useRouter: jest.fn(() => ({ replace: jest.fn(), back: jest.fn() })),
  };
});

describe('QuizScreen', () => {
  it('should render the question text with testID "question-text"', () => {
    render(<QuizScreen />);
    expect(screen.getByTestId('question-text')).toBeTruthy();
  });

  it('should render 4 answer options', () => {
    render(<QuizScreen />);
    expect(screen.getByTestId('option-0')).toBeTruthy();
    expect(screen.getByTestId('option-1')).toBeTruthy();
    expect(screen.getByTestId('option-2')).toBeTruthy();
    expect(screen.getByTestId('option-3')).toBeTruthy();
  });

  it('should highlight correct option in green and incorrect in red after selecting wrong answer', () => {
    render(<QuizScreen />);
    // Select option 0 (wrong: correct is index 1 for first question)
    const option = screen.getByTestId('option-0');
    fireEvent.press(option);
    // Correct answer (index 1) should turn green
    expect(screen.getByTestId('option-1')).toHaveStyle({ backgroundColor: '#006B5F' });
    // Selected wrong answer (index 0) should turn red
    expect(screen.getByTestId('option-0')).toHaveStyle({ backgroundColor: '#C0392B' });
  });

  it('should render the next-question button', () => {
    render(<QuizScreen />);
    expect(screen.getByTestId('next-question')).toBeTruthy();
  });

  it('should allow pressing next after selecting an answer', () => {
    render(<QuizScreen />);
    const option = screen.getByTestId('option-1');
    fireEvent.press(option);
    const nextButton = screen.getByTestId('next-question');
    // Button should be pressable after answering
    expect(nextButton).toBeTruthy();
    fireEvent.press(nextButton);
    // Question text should still be visible (still has 7 more questions)
    expect(screen.getByTestId('question-text')).toBeTruthy();
  });
});
