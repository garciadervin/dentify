// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'dist-web/*'],
  },
  {
    // React Three Fiber JSX uses THREE intrinsics (directionalLight, primitive,
    // …) whose props (position, intensity, castShadow, object) are not DOM
    // attributes — react/no-unknown-property is a false positive here.
    files: ['**/*.{tsx,ts}'],
    rules: {
      'react/no-unknown-property': [
        'error',
        { ignore: ['position', 'intensity', 'castShadow', 'object', 'args', 'attach'] },
      ],
    },
  },
]);
