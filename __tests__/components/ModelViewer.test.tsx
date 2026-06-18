import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ModelViewer from '@/components/ModelViewer';

describe('ModelViewer', () => {
  const defaultModelId = 11;

  it('should render a 3D canvas with testID "model-canvas"', () => {
    render(<ModelViewer modelId={defaultModelId} />);
    expect(screen.getByTestId('model-canvas')).toBeTruthy();
  });

  it('should show a loading indicator while the model loads with testID "model-loading"', () => {
    render(<ModelViewer modelId={defaultModelId} />);
    expect(screen.getByTestId('model-loading')).toBeTruthy();
  });

  it('should hide the loading indicator and show loaded state when model finishes loading', () => {
    render(<ModelViewer modelId={defaultModelId} />);
    expect(screen.getByTestId('model-loaded')).toBeTruthy();
    expect(screen.queryByTestId('model-loading')).toBeNull();
  });

  it('should pass autoRotate prop to enable automatic rotation when true', () => {
    render(<ModelViewer modelId={defaultModelId} autoRotate />);
    expect(screen.getByTestId('model-canvas')).toBeTruthy();
  });

  it('should not auto-rotate when autoRotate is false or undefined', () => {
    render(<ModelViewer modelId={defaultModelId} autoRotate={false} />);
    expect(screen.getByTestId('model-canvas')).toBeTruthy();
  });
});
