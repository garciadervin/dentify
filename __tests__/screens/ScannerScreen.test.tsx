import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ScannerScreen from '@/app/(tabs)/scanner';

describe('ScannerScreen', () => {
  it('should render text indicating it is the diagnostic scanner', () => {
    render(<ScannerScreen />);
    expect(screen.getByText(/scanner|scan|diagnostic|escáner|escaner/i)).toBeTruthy();
  });
});
