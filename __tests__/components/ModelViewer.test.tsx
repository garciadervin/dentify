import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ModelViewer from '@/components/ModelViewer';

describe('ModelViewer', () => {
  const modelUri = '/mock/tooth.glb';

  it('should render the 3D canvas', () => {
    render(<ModelViewer modelUri={modelUri} />);
    expect(screen.getByTestId('model-canvas')).toBeTruthy();
    expect(screen.getByTestId('model-viewer')).toBeTruthy();
  });

  it('should render with autoRotate in either state', () => {
    const { rerender } = render(<ModelViewer modelUri={modelUri} autoRotate />);
    expect(screen.getByTestId('model-canvas')).toBeTruthy();
    rerender(<ModelViewer modelUri={modelUri} autoRotate={false} />);
    expect(screen.getByTestId('model-canvas')).toBeTruthy();
  });
});
