import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SimulatorScreen from '@/app/(tabs)/simulator';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({ type: 'WIFI' })),
  NetworkStateType: { CELLULAR: 'CELLULAR', WIFI: 'WIFI', NONE: 'NONE' },
}));

describe('SimulatorScreen', () => {
  it('should render the ModelViewer component with testID "model-viewer"', async () => {
    render(<SimulatorScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('model-viewer')).toBeTruthy();
    });
  });

  it('should render the ModelControls component with testID "model-controls"', () => {
    render(<SimulatorScreen />);
    expect(screen.getByTestId('model-controls')).toBeTruthy();
  });

  it('should render the ToothSelector component with testID "tooth-selector"', () => {
    render(<SimulatorScreen />);
    expect(screen.getByTestId('tooth-selector')).toBeTruthy();
  });

  it('should display the default tooth name (Incisivo Central Superior)', async () => {
    render(<SimulatorScreen />);
    await waitFor(() => {
      expect(screen.getAllByText(/incisivo central superior/i).length).toBeGreaterThan(0);
    });
  });

  it('should update the tooth name when a different tooth is selected', async () => {
    render(<SimulatorScreen />);
    await waitFor(() => {
      expect(screen.getAllByText(/incisivo central superior/i).length).toBeGreaterThan(0);
    });
    fireEvent.press(screen.getByTestId('tooth-16'));
    await waitFor(() => {
      expect(screen.getAllByText(/primer molar superior/i).length).toBeGreaterThan(0);
    });
  });
});
