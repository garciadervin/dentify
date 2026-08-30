import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import QuestionRenderer from '@/components/quiz/QuestionRenderer';
import type { QuizQuestion } from '@/src/services/quiz';

function base(): QuizQuestion {
  return {
    id: 'q1', question: 'Pregunta', type: 'mcq', options: ['A', 'B', 'C', 'D'],
    correctIndex: 1, correctIndexes: null, pairs: null, orderItems: null,
    caseId: null, caseText: null, hint: null, points: 10, difficulty: 1,
    explanation: 'Explicación', specialty: 'Operatoria Dental', level: 1,
  };
}

describe('QuestionRenderer', () => {
  it('grades an mcq answer correctly', () => {
    const onAnswered = jest.fn();
    render(<QuestionRenderer question={base()} onAnswered={onAnswered} index={0} total={5} />);
    fireEvent.press(screen.getByTestId('option-1'));
    expect(onAnswered).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('quiz-feedback')).toBeTruthy();
  });

  it('grades true_false', () => {
    const q = { ...base(), type: 'true_false' as const, options: ['Verdadero', 'Falso'], correctIndex: 0 };
    const onAnswered = jest.fn();
    render(<QuestionRenderer question={q} onAnswered={onAnswered} index={0} total={5} />);
    fireEvent.press(screen.getByTestId('option-0'));
    expect(onAnswered).toHaveBeenCalledWith(true);
  });

  it('grades multi_select only after confirming', () => {
    const q = { ...base(), type: 'multi_select' as const, options: ['A', 'B', 'C', 'D'], correctIndexes: [0, 2] };
    const onAnswered = jest.fn();
    render(<QuestionRenderer question={q} onAnswered={onAnswered} index={0} total={5} />);
    fireEvent.press(screen.getByTestId('option-0'));
    fireEvent.press(screen.getByTestId('option-2'));
    fireEvent.press(screen.getByTestId('quiz-confirm'));
    expect(onAnswered).toHaveBeenCalledWith(true);
  });

  it('grades multi_select as wrong when the set differs', () => {
    const q = { ...base(), type: 'multi_select' as const, options: ['A', 'B', 'C', 'D'], correctIndexes: [0, 2] };
    const onAnswered = jest.fn();
    render(<QuestionRenderer question={q} onAnswered={onAnswered} index={0} total={5} />);
    fireEvent.press(screen.getByTestId('option-0'));
    fireEvent.press(screen.getByTestId('option-1'));
    fireEvent.press(screen.getByTestId('quiz-confirm'));
    expect(onAnswered).toHaveBeenCalledWith(false);
  });

  it('grades order by tapping the correct sequence', () => {
    const q = {
      ...base(), type: 'order' as const,
      orderItems: [
        { text: 'Primero', position: 1 },
        { text: 'Segundo', position: 2 },
        { text: 'Tercero', position: 3 },
      ],
    };
    const onAnswered = jest.fn();
    render(<QuestionRenderer question={q} onAnswered={onAnswered} index={0} total={5} />);
    // Tap items in position order: indexes 0, 1, 2 (positions 1, 2, 3).
    fireEvent.press(screen.getByTestId('order-option-0'));
    fireEvent.press(screen.getByTestId('order-option-1'));
    fireEvent.press(screen.getByTestId('order-option-2'));
    fireEvent.press(screen.getByTestId('quiz-confirm'));
    expect(onAnswered).toHaveBeenCalledWith(true);
  });

  it('renders a clinical case header with its sub-question', () => {
    const q = {
      ...base(), type: 'case' as const, caseId: 'case-1', caseText: 'Paciente de 22 años con dolor frío.',
      question: '¿Cuál es el diagnóstico?', correctIndex: 1,
    };
    const onAnswered = jest.fn();
    render(<QuestionRenderer question={q} onAnswered={onAnswered} index={0} total={5} />);
    expect(screen.getByTestId('quiz-case')).toBeTruthy();
    expect(screen.getByText(/Paciente de 22 años/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('option-1'));
    expect(onAnswered).toHaveBeenCalledWith(true);
  });

  it('reveals the hint when tapped', () => {
    const q = { ...base(), hint: 'Pista útil' };
    render(<QuestionRenderer question={q} onAnswered={jest.fn()} index={0} total={5} />);
    fireEvent.press(screen.getByTestId('quiz-hint'));
    expect(screen.getByTestId('quiz-hint-text')).toBeTruthy();
  });
});
