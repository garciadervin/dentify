/**
 * GLB model resolver — converts module references to local URIs
 * for use with @react-three/drei's useGLTF.
 *
 * In Expo Go, bundled assets referenced via require() are resolved
 * using resolveAssetSource from react-native, which returns the
 * correct local file URI without needing expo-asset downloadAsync.
 */

import { Image } from 'react-native';

/**
 * Cache of resolved asset URIs keyed by module id.
 */
const uriCache = new Map<string, string>();

/**
 * Resolves a GLB model to its local URI.
 *
 * @param moduleRef — result of `require('@/assets/models/...')`
 * @returns The local file URI
 */
export async function resolveModelUri(moduleRef: number): Promise<string> {
  const key = String(moduleRef);

  if (uriCache.has(key)) {
    return uriCache.get(key)!;
  }

  // resolveAssetSource returns { uri, width, height } for bundled assets
  const source = Image.resolveAssetSource(moduleRef);

  if (!source?.uri) {
    throw new Error(`Could not resolve URI for asset ${moduleRef}`);
  }

  uriCache.set(key, source.uri);
  return source.uri;
}

/**
 * Synchronous version — returns the URI if already cached.
 */
export function getCachedModelUri(moduleRef: number): string {
  const key = String(moduleRef);
  const uri = uriCache.get(key);
  if (!uri) {
    throw new Error(`Model ${moduleRef} not yet resolved. Call resolveModelUri() first.`);
  }
  return uri;
}
