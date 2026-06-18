/**
 * ModelViewer — 3D dental model viewer with raycasting and anatomical labels
 *
 * Uses @react-three/fiber/native Canvas with raycasting support.
 * When user taps on a model structure, it detects the hit mesh and
 * displays an HTML overlay label near the selection point.
 *
 * Loading state is driven by @react-three/drei's useProgress hook,
 * which tracks actual model download progress.
 */

import React, { Suspense, useRef, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Dimensions } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';

interface ModelViewerProps {
  modelId: number;
  autoRotate?: boolean;
  zoom?: number;
  onStructureSelect?: (name: string | null) => void;
  selectedStructure?: string | null;
}

/**
 * Inner 3D scene — loads the GLB model, applies auto-rotation, and handles raycasting.
 */
function ModelScene({
  modelId,
  autoRotate,
  zoom = 1.0,
  onStructureSelect,
}: {
  modelId: number;
  autoRotate: boolean;
  zoom?: number;
  onStructureSelect?: (name: string | null) => void;
}) {
  // @react-three/drei/native supports number (asset module ID) in React Native
  const { scene } = useGLTF(modelId as unknown as string) as unknown as { scene: THREE.Scene };
  const meshRef = useRef<any>(null);
  const { camera, gl } = useThree();
  const [hoveredMesh, setHoveredMesh] = useState<THREE.Object3D | null>(null);

  useFrame((_state, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
    // Adjust camera distance based on zoom prop
    const targetZ = 5 / zoom;
    camera.position.z += (targetZ - camera.position.z) * 0.1;
  });

  /**
   * Handle tap/click on the canvas — cast a ray and detect mesh hits.
   */
  const handlePointerDown = useCallback(
    (event: any) => {
      if (!scene || !camera) return;

      // Calculate pointer position in normalized device coordinates
      const { clientX, clientY } = event.nativeEvent;
      const { width, height } = Dimensions.get('window');

      const x = (clientX / width) * 2 - 1;
      const y = -(clientY / height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(x, y);

      raycaster.setFromCamera(mouse, camera);

      // Collect all meshes from the scene
      const meshes: THREE.Object3D[] = [];
      scene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          meshes.push(child);
        }
      });

      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const structureName =
          hitMesh.userData?.name ??
          hitMesh.name ??
          'Estructura dental';

        setHoveredMesh(hitMesh);
        onStructureSelect?.(structureName);
      } else {
        setHoveredMesh(null);
        onStructureSelect?.(null);
      }
    },
    [scene, camera, onStructureSelect]
  );

  return (
    <group ref={meshRef}>
      <primitive object={scene} scale={1} onPointerDown={handlePointerDown} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
    </group>
  );
}

/**
 * Inner component that reads useProgress to determine loading state.
 * Must be rendered inside <Canvas> so useProgress has access to the R3F context.
 * Renders the ActivityIndicator while progress < 100.
 */
function LoadingOverlay() {
  const { progress } = useProgress();
  const isLoading = progress < 100;

  if (!isLoading) {
    return <View testID="model-loaded" style={StyleSheet.absoluteFill} pointerEvents="none" />;
  }

  return (
    <ActivityIndicator
      testID="model-loading"
      size="large"
      color="#0077B6"
      style={styles.loading}
    />
  );
}

/**
 * 3D model viewer using @react-three/fiber/native Canvas.
 * Shows a loading indicator while the model loads (tracked via useProgress inside Canvas).
 * Supports raycasting for structure selection and floating labels.
 */
export default function ModelViewer({
  modelId,
  autoRotate = false,
  zoom = 1.0,
  onStructureSelect,
  selectedStructure,
}: ModelViewerProps) {
  return (
    <View style={styles.container} testID="model-viewer">
      <Canvas testID="model-canvas" style={styles.canvas}>
        <Suspense fallback={null}>
          <ModelScene
            modelId={modelId}
            autoRotate={autoRotate}
            zoom={zoom}
            onStructureSelect={onStructureSelect}
          />
        </Suspense>
        <LoadingOverlay />
      </Canvas>

      {/* Floating label for selected structure */}
      {selectedStructure && (
        <View style={styles.floatingLabel} pointerEvents="none">
          <View style={styles.labelContent}>
            <Text style={styles.labelText}>{selectedStructure}</Text>
          </View>
          <View style={styles.labelPointer} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  canvas: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -18 }, { translateY: -18 }],
  },
  floatingLabel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  labelContent: {
    backgroundColor: 'rgba(0, 119, 182, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  labelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  labelPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 119, 182, 0.85)',
    marginTop: -1,
  },
});
