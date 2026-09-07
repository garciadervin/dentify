/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo/vector-icons.tsx',
    '^@expo/vector-icons/(.*)$': '<rootDir>/__mocks__/@expo/vector-icons.tsx',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context/index.tsx',
    '^react-native$': '<rootDir>/__mocks__/react-native/index.ts',
    '^expo-image$': '<rootDir>/__mocks__/expo-image.tsx',
    '^expo-image-picker$': '<rootDir>/__mocks__/expo-image-picker.ts',
    '^expo-document-picker$': '<rootDir>/__mocks__/expo-document-picker.ts',
    '^react-native-markdown-display$': '<rootDir>/__mocks__/react-native-markdown-display.tsx',
    '\\.(glb|gltf)$': '<rootDir>/__mocks__/fileMock.js',
  },
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/expo-env.d.ts',
    '!**/nativewind-env.d.ts',
  ],
};
