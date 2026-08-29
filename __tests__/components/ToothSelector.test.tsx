import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ToothSelector from '@/components/ToothSelector';

describe('ToothSelector', () => {
  const defaultProps = {
    onSelectTooth: jest.fn(),
    selectedTooth: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a grid of teeth with testID "tooth-selector-grid"', () => {
    render(<ToothSelector {...defaultProps} />);
    expect(screen.getByTestId('tooth-selector-grid')).toBeTruthy();
  });

  it('should render the 16 unique models (superiores 11–18, inferiores 31–38)', () => {
    render(<ToothSelector {...defaultProps} />);
    for (const num of [11, 12, 13, 14, 15, 16, 17, 18, 31, 32, 33, 34, 35, 36, 37, 38]) {
      expect(screen.getByTestId(`tooth-${num}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('tooth-21')).toBeNull();
    expect(screen.queryByTestId('tooth-41')).toBeNull();
  });

  it('should call onSelectTooth with the tooth number when a tooth is pressed', () => {
    render(<ToothSelector {...defaultProps} />);
    fireEvent.press(screen.getByTestId('tooth-11'));
    expect(defaultProps.onSelectTooth).toHaveBeenCalledWith(11);
  });

  it('should call onSelectTooth with 18 when tooth 18 is pressed', () => {
    render(<ToothSelector {...defaultProps} />);
    fireEvent.press(screen.getByTestId('tooth-18'));
    expect(defaultProps.onSelectTooth).toHaveBeenCalledWith(18);
  });

  it('should display the name of the selected tooth with testID "selected-tooth-name"', () => {
    render(<ToothSelector {...defaultProps} selectedTooth={11} />);
    expect(screen.getByTestId('selected-tooth-name')).toBeTruthy();
  });

  it('should show the correct tooth name text when a tooth is selected', () => {
    render(<ToothSelector {...defaultProps} selectedTooth={11} />);
    expect(screen.getByText(/incisivo central superior/i)).toBeTruthy();
  });

  it('should not show selected-tooth-name when no tooth is selected', () => {
    render(<ToothSelector {...defaultProps} selectedTooth={null} />);
    expect(screen.queryByTestId('selected-tooth-name')).toBeNull();
  });

  it('should apply a highlighted style to the selected tooth', () => {
    render(<ToothSelector {...defaultProps} selectedTooth={11} />);
    expect(screen.getByTestId('tooth-11')).toBeTruthy();
  });
});
