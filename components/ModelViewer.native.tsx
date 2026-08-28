/**
 * ModelViewer — 3D dental model viewer
 *
 * Accepts a resolved local URI (string) from resolveModelUri().
 * Renders with @react-three/fiber/native + drei's useGLTF.
 * Supports touch-based orbit (pan/rotate/zoom) via OrbitControls.
 * Raycasting detects tapped mesh and surfaces anatomical names.
 */

import React, { Suspense, useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { useGLTF, useProgress, OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';

interface ModelViewerProps {
  modelUri: string;
  autoRotate?: boolean;
  onStructureSelect?: (name: string | null) => void;
  selectedStructure?: string | null;
  esmalteOpacity?: number;
  dentinaOpacity?: number;
  pulpaOpacity?: number;
  exploded?: boolean;
}

// ---------------------------------------------------------------------------
// Inner scene — loads GLB and handles raycasting
// ---------------------------------------------------------------------------

function ModelScene({
  modelUri,
  autoRotate,
  onStructureSelect,
  esmalteOpacity = 1,
  dentinaOpacity = 1,
  pulpaOpacity = 1,
  exploded = false,
}: {
  modelUri: string;
  autoRotate: boolean;
  onStructureSelect?: (name: string | null) => void;
  esmalteOpacity?: number;
  dentinaOpacity?: number;
  pulpaOpacity?: number;
  exploded?: boolean;
}) {
  const { scene } = useGLTF(modelUri) as unknown as { scene: THREE.Scene };
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Traverse the scene and set transparent/opacity properties dynamically
  useEffect(() => {
    if (!scene || typeof scene.traverse !== 'function') return;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = (mesh.name || '').toLowerCase();
        
        // Ensure material transparency is active
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        
        materials.forEach((mat) => {
          if (mat) {
            mat.transparent = true;
            
            // Check if mesh name matches dental structure layers
            if (name.includes('esmalte') || name.includes('enamel') || name.includes('crown') || name.includes('external')) {
              mat.opacity = esmalteOpacity;
            } else if (name.includes('dentina') || name.includes('dentin') || name.includes('middle')) {
              mat.opacity = dentinaOpacity;
            } else if (name.includes('pulpa') || name.includes('pulp') || name.includes('nerve') || name.includes('inner')) {
              mat.opacity = pulpaOpacity;
            }
          }
        });
      }
    });
  }, [scene, esmalteOpacity, dentinaOpacity, pulpaOpacity]);

  // Apply explosion view displacement vertically
  useEffect(() => {
    if (!scene || typeof scene.traverse !== 'function') return;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = (mesh.name || '').toLowerCase();
        
        if (!exploded) {
          mesh.position.set(0, 0, 0);
          return;
        }

        // Apply offset displacement
        if (name.includes('esmalte') || name.includes('enamel') || name.includes('crown') || name.includes('external')) {
          mesh.position.set(0, 0.6, 0);
        } else if (name.includes('pulpa') || name.includes('pulp') || name.includes('nerve') || name.includes('inner')) {
          mesh.position.set(0, -0.6, 0);
        }
      }
    });
  }, [scene, exploded]);

  useFrame((_state, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  const handlePointerDown = useCallback(
    (event: any) => {
      if (!scene || !camera) return;

      const { locationX, locationY } = event.nativeEvent;
      const { width, height } = Dimensions.get('window');

      const x = (locationX / width) * 2 - 1;
      const y = -(locationY / height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const meshes: THREE.Mesh[] = [];
      if (typeof scene.traverse === 'function') {
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
        });
      }

      const intersects = raycaster.intersectObjects(meshes, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const name = hit.userData?.name || hit.name || 'Estructura dental';
        onStructureSelect?.(name);
      } else {
        onStructureSelect?.(null);
      }
    },
    [scene, camera, onStructureSelect]
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
// Loading overlay — must live inside <Canvas> to access R3F context
// ---------------------------------------------------------------------------

function LoadingOverlay() {
  const { progress } = useProgress();
  if (progress >= 100) {
    return <View testID="model-loaded" style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} />;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export default function ModelViewer({
  modelUri,
  autoRotate = false,
  onStructureSelect,
  selectedStructure,
  esmalteOpacity = 1,
  dentinaOpacity = 1,
  pulpaOpacity = 1,
  exploded = false,
}: ModelViewerProps) {
  const [canvasReady, setCanvasReady] = useState(false);
  const { progress } = useProgress();
  const isLoading = !canvasReady || progress < 100;

  return (
    <View style={styles.container} testID="model-viewer">
      <Canvas
        testID="model-canvas"
        style={styles.canvas}
        onCreated={() => setCanvasReady(true)}
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true }}
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

        <Suspense fallback={null}>
          <ModelScene
            modelUri={modelUri}
            autoRotate={autoRotate}
            onStructureSelect={onStructureSelect}
            esmalteOpacity={esmalteOpacity}
            dentinaOpacity={dentinaOpacity}
            pulpaOpacity={pulpaOpacity}
            exploded={exploded}
          />
        </Suspense>

        <LoadingOverlay />
      </Canvas>

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
}

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
