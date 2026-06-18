/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^test-renderer$': 'react-test-renderer',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo/vector-icons.tsx',
    '^@expo/vector-icons/(.*)$': '<rootDir>/__mocks__/@expo/vector-icons.tsx',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context/index.tsx',
    '^react-native$': '<rootDir>/__mocks__/react-native/index.ts',
    '\\.(glb|gltf)$': '<rootDir>/__mocks__/fileMock.js',
  },
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/expo-env.d.ts',
    '!**/nativewind-env.d.ts',
  ],
};
