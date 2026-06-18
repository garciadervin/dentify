// jest.setup.ts — Mock expo modules for testing
import { jest } from '@jest/globals';

// Set test environment variables for services that need them
// GROQ_API_KEY is set here so tests can manipulate it via delete/restore
process.env.GROQ_API_KEY = 'test-groq-api-key';
// Supabase credentials for RAG tests (uses mock @supabase/supabase-js)
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock global fetch for Groq API tests
global.fetch = jest.fn() as any;
(global.fetch as any).mockImplementation(async (url: string) => {
  if (url.includes('chat/completions')) {
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Respuesta simulada de Denty-AI.' } }],
      }),
    };
  }
  if (url.includes('audio/transcriptions')) {
    return {
      ok: true,
      json: async () => ({ text: 'Transcripción simulada.' }),
    };
  }
  return { ok: true, json: async () => ({}) };
});

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true]),
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

// Mock expo to prevent errors when tests use jest.requireActual('expo-router')
jest.mock('expo', () => ({
  registerRootComponent: jest.fn(),
  requireOptionalNativeModule: jest.fn(() => null),
  requireNativeModule: jest.fn(() => ({})),
}));

// Mock react-native-screens to prevent native module errors
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  screensEnabled: jest.fn(() => true),
  Screen: 'Screen',
  ScreenStack: 'ScreenStack',
  ScreenStackHeaderConfig: 'ScreenStackHeaderConfig',
  ScreenStackHeaderSubview: 'ScreenStackHeaderSubview',
  ScreenStackHeaderBackButtonImage: 'ScreenStackHeaderBackButtonImage',
  ScreenStackHeaderRightView: 'ScreenStackHeaderRightView',
  ScreenStackHeaderLeftView: 'ScreenStackHeaderLeftView',
  ScreenStackHeaderCenterView: 'ScreenStackHeaderCenterView',
  SearchBar: 'SearchBar',
  FullWindowOverlay: 'FullWindowOverlay',
  NativeScreensModule: {},
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
  Gesture: {
    Pan: () => ({}),
    Tap: () => ({}),
    Native: () => ({}),
  },
  State: {},
  PanGestureHandler: 'PanGestureHandler',
  TapGestureHandler: 'TapGestureHandler',
  LongPressGestureHandler: 'LongPressGestureHandler',
  PinchGestureHandler: 'PinchGestureHandler',
  RotationGestureHandler: 'RotationGestureHandler',
  FlingGestureHandler: 'FlingGestureHandler',
  NativeViewGestureHandler: 'NativeViewGestureHandler',
  ScrollView: 'ScrollView',
  Switch: 'Switch',
  TextInput: 'TextInput',
  DrawerLayout: 'DrawerLayout',
  FlatList: 'FlatList',
}));

// Mock expo-av for voice recording
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() => ({ granted: true })),
    setAudioModeAsync: jest.fn(),
    Recording: {
      createAsync: jest.fn(() => ({
        recording: {
          stopAndUnloadAsync: jest.fn(),
          getURI: jest.fn(() => 'file:///mock/recording.m4a'),
        },
      })),
      RecordingOptionsPresets: {
        HIGH_QUALITY: {},
      },
    },
  },
}));

// Mock expo-speech for TTS
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
  getVoicesAsync: jest.fn(() => Promise.resolve([])),
}));

// ── YOLO / TFJS mocks for Phase 6: YOLO Diagnosis Module ────────────────

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { ...props, testID: props.testID || 'camera-preview' }, children);
  },
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  CameraType: { front: 'front', back: 'back' },
  FlashMode: { on: 'on', off: 'off', auto: 'auto' },
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => {
  const React = require('react');
  return {
    WebView: 'WebView',
  };
});

// Mock expo-asset for model URI resolution
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      localUri: '/mock/asset.glb',
      uri: '/mock/asset.glb',
      downloadAsync: jest.fn(() => Promise.resolve()),
    })),
  },
}));

// Mock resolveAssetSource for GLB model URI resolution
jest.mock('react-native/Libraries/Image/resolveAssetSource', () => {
  return jest.fn(() => ({ uri: '/mock/resolved-asset.glb', width: 0, height: 0 }));
});

export {};

/**
 * Mock expo-router so that useRouter is always a jest.fn().
 * This ensures jest.mocked(...).mockReturnValueOnce works in tests.
 *
 * Note: test-level jest.mock() calls with inline factories will override this,
 * but the inline factories in RegisterScreen and ProfileSetupScreen tests
 * define useRouter as a plain arrow function (not jest.fn()), which causes
 * jest.mocked(...).mockReturnValueOnce to fail.
 *
 * To make those tests pass, the inline factories would need to define
 * useRouter as jest.fn(() => ({...})). Since we cannot modify test files,
 * this setup provides a fallback mock that works when tests don't provide
 * their own factory for expo-router.
 */
jest.mock('expo-router', () => {
  const { TouchableOpacity } = require('react-native');
  const mockReact = require('react');
  return {
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    })),
    useSegments: jest.fn(() => []),
    useLocalSearchParams: jest.fn(() => ({})),
    Link: ({ children, ...props }: any) =>
      mockReact.createElement(TouchableOpacity, props, children),
    Stack: {
      Screen: ({ children, ...props }: any) =>
        mockReact.createElement('StackScreen', props, children),
    },
    Tabs: {
      Screen: ({ children, ...props }: any) =>
        mockReact.createElement('TabsScreen', props, children),
    },
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    },
  };
});

// ── 3D / GL mocks for Phase 5: 3D Simulator ──────────────────────────────

// Mock expo-gl
jest.mock('expo-gl', () => ({
  GLView: 'GLView',
}));

// Mock @react-three/fiber/native — Canvas renders a plain View
jest.mock('@react-three/fiber/native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Canvas: React.forwardRef(({ children, style, testID, ...props }: any, ref: any) =>
      React.createElement(View, { ref, style, testID, ...props }, children),
    ),
    useFrame: jest.fn(),
    useThree: jest.fn(() => ({
      camera: { position: { set: jest.fn() }, lookAt: jest.fn() },
      gl: { domElement: {} },
      scene: {},
    })),
  };
});

// Mock @react-three/fiber (non-native)
jest.mock('@react-three/fiber', () => ({
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({
    camera: { position: { set: jest.fn() }, lookAt: jest.fn() },
    gl: { domElement: {} },
    scene: {},
  })),
}));

// Mock @react-three/drei
jest.mock('@react-three/drei', () => {
  const React = require('react');
  const { View } = require('react-native');

  const useGLTF = jest.fn(() => ({ scene: {} }));
  // useProgress: module-level counter so first 2 calls show loading, rest show loaded
  // This matches the old instanceCount behavior that tests expect
  let _progressCalls = 0;
  const useProgress = jest.fn(() => {
    _progressCalls++;
    if (_progressCalls <= 2) {
      return { progress: 0, active: true, errors: [], item: '', loaded: 0, total: 100 };
    }
    return { progress: 100, active: false, errors: [], item: '', loaded: 100, total: 100 };
  });

  return {
    useGLTF,
    useProgress,
    OrbitControls: React.forwardRef((props: any, ref: any) =>
      React.createElement(View, { ref }),
    ),
    Center: ({ children, ...props }: any) =>
      React.createElement(View, props, children),
  };
});

// Mock three.js
jest.mock('three', () => ({
  Scene: jest.fn(() => ({ add: jest.fn() })),
  PerspectiveCamera: jest.fn(() => ({ position: { set: jest.fn() }, lookAt: jest.fn() })),
  WebGLRenderer: jest.fn(() => ({ setSize: jest.fn(), domElement: {} })),
  AmbientLight: jest.fn(),
  DirectionalLight: jest.fn(),
  Group: jest.fn(() => ({ add: jest.fn(), rotation: { y: 0 } })),
  Mesh: jest.fn(),
  BufferGeometry: jest.fn(),
  MeshStandardMaterial: jest.fn(),
  Color: jest.fn(),
  Vector3: jest.fn(() => ({ set: jest.fn(), clone: jest.fn() })),
  Box3: jest.fn(() => ({ setFromObject: jest.fn(), getCenter: jest.fn(), getSize: jest.fn() })),
}));

// Mock expo-file-system (new class-based API for SDK 54)
const mockFileInstance = {
  exists: true,
  size: 1024,
  uri: '/mock/file.tflite',
  base64: jest.fn(async () => 'mock-base64-content'),
  text: jest.fn(async () => 'mock-text-content'),
  bytes: jest.fn(async () => new Uint8Array(10)),
  dispose: jest.fn(),
};
const mockDirectoryInstance = {
  exists: true,
  uri: '/mock/directory/',
  list: jest.fn(() => []),
  create: jest.fn(),
};
const mockPaths = {
  cache: mockDirectoryInstance,
  document: mockDirectoryInstance,
  bundle: mockDirectoryInstance,
  appleSharedContainers: {},
  availableDiskSpace: 1000000,
  totalDiskSpace: 10000000,
};

jest.mock('expo-file-system', () => ({
  File: jest.fn(() => mockFileInstance),
  Directory: jest.fn(() => mockDirectoryInstance),
  Paths: mockPaths,
}));
