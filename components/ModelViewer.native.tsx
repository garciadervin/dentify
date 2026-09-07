/**
 * ModelViewer — 3D dental model viewer
 *
 * Accepts a resolved local URI (string) from resolveModelUri().
 * Renders with @react-three/fiber/native + drei's useGLTF.
 * Supports touch-based orbit (rotate/zoom) via OrbitControls.
 * Raycasting detects tapped mesh and surfaces anatomical names.
 *
 * Native variant: model is centered at the origin, framed once, and pan is
 * disabled so it cannot leave the viewport. Zoom/reset reach the controls via
 * makeDefault + CameraController.
 */

import React, {
  Suspense,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
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

// Framing constants: the camera is moved to fit each model after centering it
// at the origin (no rescaling). ZOOM_* are the initial clamp range; per-model
// clamps are applied once the model bounds are known.
const CAMERA_DIST = 8;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 60;

/**
 * Imperative camera controller rendered inside the Canvas. Talks to the
 * OrbitControls instance exposed via makeDefault so zoom/reset stay consistent
 * with the controls' internal state (three-stdlib exposes dollyIn/dollyOut).
 */
function CameraController({ ref }: { ref: React.Ref<ModelViewerHandle> }) {
  const controls = useThree((s) => (s as any).controls) as {
    dollyIn?: (scale: number) => void;
    dollyOut?: (scale: number) => void;
    reset?: () => void;
  } | null;

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (controls?.dollyIn) controls.dollyIn(0.75);
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
  const { camera, controls, size } = useThree();

  useFrame((_state, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  const handlePointerDown = useCallback(
    (event: any) => {
      if (!scene || !camera) return;

      const { locationX, locationY } = event.nativeEvent;
      const vw = size?.width || 1;
      const vh = size?.height || 1;

      const x = (locationX / vw) * 2 - 1;
      const y = -(locationY / vh) * 2 + 1;

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
    [scene, camera, size, onStructureSelect]
  );

  // Frame the loaded model once: recenter its geometry at the origin and move
  // the camera so it fits the viewport (no rescaling — that can collapse teeth
  // whose source bounds include a stray/outlier element). Save the framed state
  // so the Reset button returns to it. Tagged so revisiting a cached model is a no-op.
  useLayoutEffect(() => {
    const sceneObj = scene as unknown as THREE.Object3D;
    if (sceneObj?.userData?.dentifyFitted === modelUri) return;
    if (!sceneObj?.position) return;
    const box = new THREE.Box3().setFromObject(sceneObj);
    if (box.isEmpty()) return;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x ?? 0, size.y ?? 0, size.z ?? 0);
    if (!Number.isFinite(maxDim) || maxDim <= 0) return;

    sceneObj.position.set(-(center.x ?? 0), -(center.y ?? 0), -(center.z ?? 0));
    sceneObj.updateMatrixWorld(true);

    // Fit distance for a 45° vertical FOV (half-height = d * tan(22.5°)).
    const dist = (maxDim / 2 / Math.tan(THREE.MathUtils.degToRad(22.5))) * 1.25;
    const ctl = controls as unknown as {
      target?: THREE.Vector3;
      minDistance: number;
      maxDistance: number;
      update?: () => void;
      saveState?: () => void;
    } | null;

    if (camera && typeof camera.position?.set === 'function') {
      camera.position.set(0, 0, Math.max(dist, 0.5));
      camera.lookAt(0, 0, 0);
    }
    if (ctl?.target) {
      ctl.target.set(0, 0, 0);
      ctl.minDistance = Math.max(dist * 0.4, 0.2);
      ctl.maxDistance = dist * 3;
      ctl.update?.();
      ctl.saveState?.();
    }

    sceneObj.userData = { ...sceneObj.userData, dentifyFitted: modelUri };
  }, [scene, modelUri, camera, controls]);

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
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
    <View className="relative flex-1 bg-sky-light" testID="model-viewer">
      <ErrorBoundary testID="model-error">
        <Canvas
          testID="model-canvas"
          style={{ flex: 1 }}
          onCreated={() => setCanvasReady(true)}
          camera={{ position: [0, 0, CAMERA_DIST], fov: 45 }}
          gl={{ antialias: true }}
        >
          {/* Orbit controls: rotate + clamped zoom; pan disabled so the model
              always stays centered in the viewport. `makeDefault` exposes the
              controls instance so CameraController (zoom/reset) can reach it. */}
          <OrbitControls
            makeDefault
            enableRotate
            enableZoom
            enablePan={false}
            target={[0, 0, 0]}
            minDistance={ZOOM_MIN}
            maxDistance={ZOOM_MAX}
            zoomSpeed={1.1}
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
          {/* NOTE: No RN View inside Canvas — the R3F reconciler rejects it and
              the scene lands in the ErrorBoundary below. */}
        </Canvas>
      </ErrorBoundary>

      {/* Loading indicator outside Canvas */}
      {isLoading && (
        <View className="absolute inset-0 items-center justify-center" style={{ pointerEvents: 'none' }}>
          <ActivityIndicator
            testID="model-loading"
            size="large"
            color="#0077B6"
          />
        </View>
      )}

      {/* Model loaded marker for tests */}
      {!isLoading && (
        <View testID="model-loaded" className="absolute inset-0" style={{ pointerEvents: 'none' }} />
      )}

      {/* Anatomical label for selected structure */}
      {selectedStructure && (
        <View className="absolute inset-x-4 bottom-5 items-center" style={{ pointerEvents: 'none' }}>
          <View className="rounded-[12px] bg-clinical-blue/90 px-[18px] py-2.5">
            <Text className="text-center font-inter-semibold text-[13px] text-white">{selectedStructure}</Text>
          </View>
          <View className="-mt-px h-0 w-0 border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-clinical-blue/90" />
        </View>
      )}

      {/* Gesture hint — show briefly */}
      {canvasReady && !isLoading && (
        <View className="absolute inset-x-0 top-3 items-center" style={{ pointerEvents: 'none' }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 11, color: 'rgba(112, 120, 125, 0.8)', backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, overflow: 'hidden' }}>
            Arrastra para rotar · Pellizca para zoom
          </Text>
        </View>
      )}
    </View>
  );
});

export default ModelViewer;
