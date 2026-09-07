/**
 * Model Cache Service — Offline model caching using expo-file-system
 *
 * Manages downloading 3D models from bundled assets to the device's
 * document directory for offline use.
 */

import { Paths, File, Directory } from 'expo-file-system';

const MODEL_BASE = 'assets/models/';

/**
 * Get the cache directory for models.
 */
function getCacheDir(): Directory {
  return new Directory(Paths.document, MODEL_BASE);
}

/**
 * Get the cache file path for a model.
 */
function getCacheFile(modelFile: string): File {
  return new File(getCacheDir(), modelFile);
}

/**
 * Check if a model file exists in the local cache.
 */
export async function isModelCached(modelFile: string): Promise<boolean> {
  try {
    const file = getCacheFile(modelFile);
    const info = Paths.info(file.uri);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Download a model from bundled assets to the cache directory.
 * Creates the cache directory if it doesn't exist.
 */
export async function cacheModel(modelFile: string): Promise<void> {
  try {
    // Ensure the cache directory exists before copying into it.
    const cacheDir = getCacheDir();
    cacheDir.create({ intermediates: true });

    const destination = getCacheFile(modelFile);

    // Check if already cached
    if (Paths.info(destination.uri).exists) return;

    // Copy from bundle to cache directory
    const bundleFile = new File(Paths.bundle, MODEL_BASE, modelFile);
    await bundleFile.copy(destination);
  } catch {
    // Silently fail — caching is non-critical
  }
}
