const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add .glb, .gltf, .wasm to asset extensions
config.resolver.assetExts = [...config.resolver.assetExts, 'glb', 'gltf', 'wasm'];

module.exports = withNativeWind(config, { input: './global.css' });
