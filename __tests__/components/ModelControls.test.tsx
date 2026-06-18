import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ModelControls from '@/components/ModelControls';

describe('ModelControls', () => {
  const defaultProps = {
    onZoomIn: jest.fn(),
    onZoomOut: jest.fn(),
    onReset: jest.fn(),
    onToggleAutoRotate: jest.fn(),
    autoRotate: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a zoom in button with testID "zoom-in"', () => {
    render(<ModelControls {...defaultProps} />);
    expect(screen.getByTestId('zoom-in')).toBeTruthy();
  });

  it('should render a zoom out button with testID "zoom-out"', () => {
    render(<ModelControls {...defaultProps} />);
    expect(screen.getByTestId('zoom-out')).toBeTruthy();
  });

  it('should render a reset view button with testID "reset-view"', () => {
    render(<ModelControls {...defaultProps} />);
    expect(screen.getByTestId('reset-view')).toBeTruthy();
  });

  it('should render an auto-rotate toggle button with testID "auto-rotate-toggle"', () => {
    render(<ModelControls {...defaultProps} />);
    expect(screen.getByTestId('auto-rotate-toggle')).toBeTruthy();
  });

  it('should call onZoomIn when zoom in button is pressed', () => {
    render(<ModelControls {...defaultProps} />);
    fireEvent.press(screen.getByTestId('zoom-in'));
    expect(defaultProps.onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('should call onZoomOut when zoom out button is pressed', () => {
    render(<ModelControls {...defaultProps} />);
    fireEvent.press(screen.getByTestId('zoom-out'));
    expect(defaultProps.onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('should call onReset when reset view button is pressed', () => {
    render(<ModelControls {...defaultProps} />);
    fireEvent.press(screen.getByTestId('reset-view'));
    expect(defaultProps.onReset).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleAutoRotate when auto-rotate toggle is pressed', () => {
    render(<ModelControls {...defaultProps} />);
    fireEvent.press(screen.getByTestId('auto-rotate-toggle'));
    expect(defaultProps.onToggleAutoRotate).toHaveBeenCalledTimes(1);
  });

  it('should reflect the current autoRotate state on the toggle button', () => {
    const { rerender } = render(<ModelControls {...defaultProps} autoRotate={false} />);
    expect(screen.getByTestId('auto-rotate-toggle')).toBeTruthy();

    rerender(<ModelControls {...defaultProps} autoRotate />);
    expect(screen.getByTestId('auto-rotate-toggle')).toBeTruthy();
  });
});
