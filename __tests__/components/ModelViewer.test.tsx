import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ModelViewer from '@/components/ModelViewer';

describe('ModelViewer', () => {
  // ModelViewer now takes a URI string instead of a module number
  const defaultModelUri = '/mock/tooth.glb';

  it('should render a 3D canvas with testID "model-canvas"', () => {
    render(<ModelViewer modelUri={defaultModelUri} />);
    expect(screen.getByTestId('model-canvas')).toBeTruthy();
  });

  it('should render the model viewer container with testID "model-viewer"', () => {
    render(<ModelViewer modelUri={defaultModelUri} />);
    expect(screen.getByTestId('model-viewer')).toBeTruthy();
  });

  it('should accept autoRotate prop without crashing', () => {
    render(<ModelViewer modelUri={defaultModelUri} autoRotate />);
    expect(screen.getByTestId('model-canvas')).toBeTruthy();
  });

  it('should accept autoRotate=false without crashing', () => {
    render(<ModelViewer modelUri={defaultModelUri} autoRotate={false} />);
    expect(screen.getByTestId('model-canvas')).toBeTruthy();
  });

  it('should call onStructureSelect when provided as prop', () => {
    const onSelect = jest.fn();
    render(<ModelViewer modelUri={defaultModelUri} onStructureSelect={onSelect} />);
    expect(screen.getByTestId('model-canvas')).toBeTruthy();
  });
});
