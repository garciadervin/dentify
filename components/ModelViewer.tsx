/**
 * ModelViewer — 3D dental model viewer
 *
 * Accepts a resolved local URI (string) from resolveModelUri().
 * Renders with @react-three/fiber/native + drei's useGLTF.
 * Supports touch-based orbit (pan/rotate/zoom) via OrbitControls.
 * Raycasting detects tapped mesh and surfaces anatomical names.
 *
 * Works on both native (iOS/Android) and web via Expo.
 * On web, the Canvas overlay uses native R3F components only (no DOM inside Canvas).
 */

import React, {
  Suspense,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber/native';
import { useGLTF, useProgress, OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import ErrorBoundary from '@/components/ErrorBoundary';

export interface ModelViewerHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

interface ModelViewerProps {
  modelUri: string;
  autoRotate?: boolean;
  onStructureSelect?: (name: string | null) => void;
  selectedStructure?: string | null;
}

/**
 * Imperative camera controller rendered inside the Canvas. Talks to the
 * OrbitControls instance via useThree().controls so zoom/reset stay consistent
 * with the controls' internal state.
 */
function CameraController({ ref }: { ref: React.Ref<ModelViewerHandle> }) {
  const controls = useThree((s) => (s as any).controls) as {
    dollyIn?: (scale: number) => void;
    dollyOut?: (scale: number) => void;
    reset?: () => void;
  } | null;

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (controls?.dollyIn) controls.dollyIn(0.8);
    },
    zoomOut: () => {
      if (controls?.dollyOut) controls.dollyOut(0.8);
    },
    reset: () => {
      if (controls?.reset) controls.reset();
    },
  }), [controls]);

  return null;
}

// ---------------------------------------------------------------------------
// Inner scene — loads GLB and handles raycasting
// ---------------------------------------------------------------------------

function ModelScene({
  modelUri,
  autoRotate,
  onStructureSelect,
}: {
  modelUri: string;
  autoRotate: boolean;
  onStructureSelect?: (name: string | null) => void;
}) {
  const { scene } = useGLTF(modelUri) as unknown as { scene: THREE.Scene };
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  // R3F pointer events raycast against the GLTF scene natively, so the hit
  // coordinates are correct regardless of the canvas size or screen layout.
  // `event.object` is the actual intersected mesh (the event bubbles up to
  // the primitive). This replaces a manual Raycaster that used window
  // dimensions and mapped taps inaccurately.
  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const hit = event.object;
      const name = hit?.userData?.name || hit?.name || 'Estructura dental';
      onStructureSelect?.(name);
    },
    [onStructureSelect]
  );

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        scale={1.2}
        onPointerDown={handlePointerDown}
      />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.9} castShadow />
      <directionalLight position={[-5, -5, -5]} intensity={0.2} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

const ModelViewer = forwardRef<ModelViewerHandle, ModelViewerProps>(function ModelViewer(
  {
    modelUri,
    autoRotate = false,
    onStructureSelect,
    selectedStructure,
  },
  ref
) {
  const [canvasReady, setCanvasReady] = useState(false);
  const { progress } = useProgress();
  const isLoading = !canvasReady || progress < 100;
  const cameraHandleRef = useRef<ModelViewerHandle>(null);

  useImperativeHandle(ref, () => ({
    zoomIn: () => cameraHandleRef.current?.zoomIn(),
    zoomOut: () => cameraHandleRef.current?.zoomOut(),
    reset: () => cameraHandleRef.current?.reset(),
  }), []);

  return (
    <View style={styles.container} testID="model-viewer">
      <ErrorBoundary testID="model-error">
        <Canvas
          testID="model-canvas"
          style={styles.canvas}
          onCreated={() => setCanvasReady(true)}
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true }}
          onPointerMissed={() => onStructureSelect?.(null)}
        >
          {/* Orbit controls for pan / rotate / zoom */}
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={2}
            maxDistance={10}
            dampingFactor={0.1}
            enableDamping
          />
          <CameraController ref={cameraHandleRef} />

          <Suspense fallback={null}>
            <ModelScene
              modelUri={modelUri}
              autoRotate={autoRotate}
              onStructureSelect={onStructureSelect}
            />
          </Suspense>
          {/* NOTE: No RN View inside Canvas — causes "Div is not part of THREE" on web */}
        </Canvas>
      </ErrorBoundary>

      {/* Loading indicator outside Canvas */}
      {isLoading && (
        <View style={[styles.loadingOverlay, { pointerEvents: 'none' }]}>
          <ActivityIndicator
            testID="model-loading"
            size="large"
            color="#0077B6"
          />
        </View>
      )}

      {/* Model loaded marker for tests */}
      {!isLoading && (
        <View testID="model-loaded" style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} />
      )}

      {/* Anatomical label for selected structure */}
      {selectedStructure && (
        <View style={[styles.labelContainer, { pointerEvents: 'none' }]}>
          <View style={styles.labelBubble}>
            <Text style={styles.labelText}>{selectedStructure}</Text>
          </View>
          <View style={styles.labelCaret} />
        </View>
      )}

      {/* Gesture hint — show briefly */}
      {canvasReady && !isLoading && (
        <View style={[styles.gestureHint, { pointerEvents: 'none' }]}>
          <Text style={styles.gestureHintText}>Arrastra para rotar · Pellizca para zoom</Text>
        </View>
      )}
    </View>
  );
});

export default ModelViewer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F7F9FB',
  },
  canvas: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  labelBubble: {
    backgroundColor: 'rgba(0, 119, 182, 0.90)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  labelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  labelCaret: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 119, 182, 0.90)',
    marginTop: -1,
  },
  gestureHint: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gestureHintText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: 'rgba(112, 120, 125, 0.8)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
