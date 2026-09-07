const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add custom asset extensions (.glb/.gltf/.wasm 3D models, .tflite YOLO model)
config.resolver.assetExts = [...config.resolver.assetExts, 'glb', 'gltf', 'wasm', 'tflite'];

module.exports = withNativeWind(config, { input: './global.css' });
