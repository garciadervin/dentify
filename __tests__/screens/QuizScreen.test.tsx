import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import QuizScreen from '@/app/quiz/[id]';

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useLocalSearchParams: jest.fn(() => ({ id: 'Operatoria Dental-1' })),
    useRouter: jest.fn(() => ({ replace: jest.fn(), back: jest.fn() })),
  };
});

jest.mock('@/src/services/quiz', () => ({
  fetchQuizQuestions: jest.fn(() =>
    Promise.resolve([
      {
        id: 'q1',
        question: '¿Cuál es la definición de caries dental según la OMS?',
        options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        correctIndex: 1,
        explanation: 'Explicación de la respuesta correcta.',
        specialty: 'Operatoria Dental',
        level: 1,
      },
      {
        id: 'q2',
        question: '¿Qué estructura del diente es la más dura?',
        options: ['Dentina', 'Cemento', 'Esmalte', 'Pulpa'],
        correctIndex: 2,
        explanation: 'El esmalte es el tejido más duro.',
        specialty: 'Operatoria Dental',
        level: 1,
      },
    ])
  ),
}));

describe('QuizScreen', () => {
  it('should render the question text with testID "question-text"', async () => {
    render(<QuizScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('question-text')).toBeTruthy();
    });
  });

  it('should render 4 answer options', async () => {
    render(<QuizScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('option-0')).toBeTruthy();
      expect(screen.getByTestId('option-1')).toBeTruthy();
      expect(screen.getByTestId('option-2')).toBeTruthy();
      expect(screen.getByTestId('option-3')).toBeTruthy();
    });
  });

  it('should highlight correct option in green and incorrect in red after selecting wrong answer', async () => {
    render(<QuizScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('option-0')).toBeTruthy();
    });
    const option = screen.getByTestId('option-0');
    fireEvent.press(option);
    expect(screen.getByTestId('option-1')).toHaveStyle({ backgroundColor: '#006B5F' });
    expect(screen.getByTestId('option-0')).toHaveStyle({ backgroundColor: '#C0392B' });
  });

  it('should render the next-question button', async () => {
    render(<QuizScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('next-question')).toBeTruthy();
    });
  });

  it('should allow pressing next after selecting an answer', async () => {
    render(<QuizScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('option-1')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('option-1'));
    const nextButton = screen.getByTestId('next-question');
    fireEvent.press(nextButton);
    expect(screen.getByTestId('question-text')).toBeTruthy();
  });
});
