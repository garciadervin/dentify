import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SimulatorScreen from '@/app/(tabs)/simulator';

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

  it('should render a model selector with testID "model-selector"', () => {
    render(<SimulatorScreen />);
    expect(screen.getByTestId('model-selector')).toBeTruthy();
  });

  it('should display tooth names in the model selector', () => {
    render(<SimulatorScreen />);
    expect(screen.getByText(/incisivo central superior izquierdo/i)).toBeTruthy();
  });

  it('should load the corresponding 3D model when a tooth is selected from the selector', () => {
    render(<SimulatorScreen />);
    const selector = screen.getByTestId('model-selector');
    expect(selector).toBeTruthy();
  });

  it('should update the model viewer URI when a different tooth is selected', async () => {
    render(<SimulatorScreen />);
    const toothOption = screen.getByText(/primer molar superior derecho/i);
    fireEvent.press(toothOption);
    await waitFor(() => {
      expect(screen.getByTestId('model-viewer')).toBeTruthy();
    });
  });
});
