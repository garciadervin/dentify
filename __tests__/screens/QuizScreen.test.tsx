import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import QuizScreen from '@/app/quiz/[id]';

// Mock expo-router useLocalSearchParams to provide a quiz id
jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useLocalSearchParams: jest.fn(() => ({ id: 'quiz-1' })),
  };
});

describe('QuizScreen', () => {
  it('should render the question text with testID "question-text"', () => {
    render(<QuizScreen />);
    expect(screen.getByTestId('question-text')).toBeTruthy();
  });

  it('should render 4 answer options with testIDs "option-0" through "option-3"', () => {
    render(<QuizScreen />);
    expect(screen.getByTestId('option-0')).toBeTruthy();
    expect(screen.getByTestId('option-1')).toBeTruthy();
    expect(screen.getByTestId('option-2')).toBeTruthy();
    expect(screen.getByTestId('option-3')).toBeTruthy();
  });

  it('should highlight the selected option when tapped', () => {
    render(<QuizScreen />);
    const option = screen.getByTestId('option-1');
    fireEvent.press(option);
    expect(option).toHaveStyle({ backgroundColor: '#0077B6' });
  });

  it('should render a "Siguiente" button with testID "next-question"', () => {
    render(<QuizScreen />);
    expect(screen.getByTestId('next-question')).toBeTruthy();
  });

  it('should show quiz result with testID "quiz-result" after completing all questions', () => {
    render(<QuizScreen />);
    // Simulate answering all questions
    const option = screen.getByTestId('option-0');
    fireEvent.press(option);
    const nextButton = screen.getByTestId('next-question');
    fireEvent.press(nextButton);
    // After last question, result should appear
    expect(screen.getByTestId('quiz-result')).toBeTruthy();
  });
});
