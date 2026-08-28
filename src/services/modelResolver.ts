/**
 * GLB model resolver — converts Metro module references to local file URIs
 * that useGLTF can load on physical devices.
 *
 * Strategy:
 * 1. Try expo-asset Asset.fromModule().downloadAsync() → asset.localUri
 *    This works on both Expo Go and standalone builds (dev + prod).
 * 2. Fall back to Image.resolveAssetSource() for environments where
 *    expo-asset is not available.
 *
 * The resolved URI is cached to avoid redundant downloads.
 */

import { Asset } from 'expo-asset';
import { Image } from 'react-native';

const uriCache = new Map<number, string>();

/**
 * Resolves a bundled GLB asset module reference to a local file URI.
 * Safe to call multiple times — subsequent calls return cached result instantly.
 *
 * @param moduleRef — numeric asset ID from `require('./model.glb')`
 * @returns Absolute local URI string (file:// or http://localhost for Expo Go)
 */
export async function resolveModelUri(moduleRef: number): Promise<string> {
  if (uriCache.has(moduleRef)) {
    return uriCache.get(moduleRef)!;
  }

  try {
    // Primary: expo-asset guarantees a localUri on the device filesystem
    const asset = Asset.fromModule(moduleRef);
    await asset.downloadAsync();

    const uri = asset.localUri ?? asset.uri;
    if (!uri) throw new Error(`expo-asset returned no URI for module ${moduleRef}`);

    uriCache.set(moduleRef, uri);
    return uri;
  } catch {
    // Fallback: resolveAssetSource works in Expo Go dev mode
    const source = Image.resolveAssetSource(moduleRef);
    if (!source?.uri) {
      throw new Error(`Could not resolve URI for asset module ${moduleRef}`);
    }
    uriCache.set(moduleRef, source.uri);
    return source.uri;
  }
}

/**
 * Returns the cached URI synchronously. Throws if resolveModelUri has not
 * been called yet for this module reference.
 */
export function getCachedModelUri(moduleRef: number): string | null {
  return uriCache.get(moduleRef) ?? null;
}

/**
 * Pre-warms the cache for a list of module references in parallel.
 * Call this on app startup to avoid loading delays in the simulator.
 */
export async function preloadModels(moduleRefs: number[]): Promise<void> {
  await Promise.allSettled(moduleRefs.map(resolveModelUri));
}
