import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SpecialtyCard from '@/components/SpecialtyCard';

describe('SpecialtyCard', () => {
  it('should render the specialty name with testID "specialty-name"', () => {
    render(<SpecialtyCard name="Operatoria Dental" level={3} progress={60} />);
    expect(screen.getByTestId('specialty-name')).toBeTruthy();
  });

  it('should display the specialty name text', () => {
    render(<SpecialtyCard name="Endodoncia" level={2} progress={40} />);
    expect(screen.getByText('Endodoncia')).toBeTruthy();
  });

  it('should render the current level with testID "specialty-level"', () => {
    render(<SpecialtyCard name="Operatoria Dental" level={3} progress={60} />);
    expect(screen.getByTestId('specialty-level')).toBeTruthy();
  });

  it('should display the correct level number', () => {
    render(<SpecialtyCard name="Operatoria Dental" level={3} progress={60} />);
    expect(screen.getByText('Nivel 3')).toBeTruthy();
  });

  it('should render a progress bar with testID "specialty-progress"', () => {
    render(<SpecialtyCard name="Operatoria Dental" level={3} progress={60} />);
    expect(screen.getByTestId('specialty-progress')).toBeTruthy();
  });

  it('should render a lock icon when locked with testID "specialty-locked"', () => {
    render(<SpecialtyCard name="Periodoncia" level={1} progress={0} locked />);
    expect(screen.getByTestId('specialty-locked')).toBeTruthy();
  });

  it('should not render a lock icon when not locked', () => {
    render(<SpecialtyCard name="Operatoria Dental" level={3} progress={60} />);
    expect(screen.queryByTestId('specialty-locked')).toBeNull();
  });
});
