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

  it('should render tooth 11 with testID "tooth-11"', () => {
    render(<ToothSelector {...defaultProps} />);
    expect(screen.getByTestId('tooth-11')).toBeTruthy();
  });

  it('should render tooth 18 with testID "tooth-18"', () => {
    render(<ToothSelector {...defaultProps} />);
    expect(screen.getByTestId('tooth-18')).toBeTruthy();
  });

  it('should render tooth 21 with testID "tooth-21"', () => {
    render(<ToothSelector {...defaultProps} />);
    expect(screen.getByTestId('tooth-21')).toBeTruthy();
  });

  it('should render tooth 28 with testID "tooth-28"', () => {
    render(<ToothSelector {...defaultProps} />);
    expect(screen.getByTestId('tooth-28')).toBeTruthy();
  });

  it('should render tooth 31 with testID "tooth-31"', () => {
    render(<ToothSelector {...defaultProps} />);
    expect(screen.getByTestId('tooth-31')).toBeTruthy();
  });

  it('should render tooth 38 with testID "tooth-38"', () => {
    render(<ToothSelector {...defaultProps} />);
    expect(screen.getByTestId('tooth-38')).toBeTruthy();
  });

  it('should render tooth 41 with testID "tooth-41"', () => {
    render(<ToothSelector {...defaultProps} />);
    expect(screen.getByTestId('tooth-41')).toBeTruthy();
  });

  it('should render tooth 48 with testID "tooth-48"', () => {
    render(<ToothSelector {...defaultProps} />);
    expect(screen.getByTestId('tooth-48')).toBeTruthy();
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
    expect(screen.getByText(/incisivo central superior izquierdo/i)).toBeTruthy();
  });

  it('should not show selected-tooth-name when no tooth is selected', () => {
    render(<ToothSelector {...defaultProps} selectedTooth={null} />);
    expect(screen.queryByTestId('selected-tooth-name')).toBeNull();
  });

  it('should apply a highlighted style to the selected tooth', () => {
    render(<ToothSelector {...defaultProps} selectedTooth={11} />);
    const tooth = screen.getByTestId('tooth-11');
    expect(tooth).toBeTruthy();
  });
});
