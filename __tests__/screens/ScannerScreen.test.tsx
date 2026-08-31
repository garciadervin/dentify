import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ScannerScreen from '@/app/(tabs)/scanner';

describe('ScannerScreen', () => {
  it('should render the diagnostic caption and a capture button', () => {
    render(<ScannerScreen />);
    expect(screen.getByText(/diagnóstico por visión/i)).toBeTruthy();
    expect(screen.getByTestId('capture-button')).toBeTruthy();
  });

  it('should show the YOLO model status while loading', () => {
    render(<ScannerScreen />);
    expect(screen.getByText(/cargando modelo yolo/i)).toBeTruthy();
  });
});
