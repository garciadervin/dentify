import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LearningPath from '@/components/LearningPath';

describe('LearningPath', () => {
  const defaultLevels = [
    { id: '1', label: 'Operatoria Dental', status: 'completed' as const },
    { id: '2', label: 'Endodoncia', status: 'active' as const },
    { id: '3', label: 'Periodoncia', status: 'locked' as const },
  ];

  it('should render a list of level nodes', () => {
    render(<LearningPath levels={defaultLevels} />);
    expect(screen.getByTestId('level-node-0')).toBeTruthy();
    expect(screen.getByTestId('level-node-1')).toBeTruthy();
    expect(screen.getByTestId('level-node-2')).toBeTruthy();
  });

  it('should render a completed node with testID "level-node-completed-{index}"', () => {
    render(<LearningPath levels={defaultLevels} />);
    expect(screen.getByTestId('level-node-completed-0')).toBeTruthy();
  });

  it('should render an active node with testID "level-node-active-{index}"', () => {
    render(<LearningPath levels={defaultLevels} />);
    expect(screen.getByTestId('level-node-active-1')).toBeTruthy();
  });

  it('should render a locked node with testID "level-node-locked-{index}"', () => {
    render(<LearningPath levels={defaultLevels} />);
    expect(screen.getByTestId('level-node-locked-2')).toBeTruthy();
  });

  it('should render a vertical connecting line between nodes', () => {
    render(<LearningPath levels={defaultLevels} />);
    expect(screen.getByTestId('path-connector-line')).toBeTruthy();
  });

  it('should render the label text for each level', () => {
    render(<LearningPath levels={defaultLevels} />);
    expect(screen.getByText('Operatoria Dental')).toBeTruthy();
    expect(screen.getByText('Endodoncia')).toBeTruthy();
    expect(screen.getByText('Periodoncia')).toBeTruthy();
  });
});
