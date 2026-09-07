/**
 * YOLO Inference Service — Dentify Diagnosis Module
 *
 * Uses a hidden WebView with TensorFlow.js (running in browser context)
 * to run the YOLO TFLite model. This approach is compatible with Expo Go
 * since it doesn't require custom native modules.
 *
 * Architecture:
 *   1. A hidden WebView loads yolo_inference.html which includes TF.js
 *   2. React Native sends model data + image data via postMessage
 *   3. The WebView runs inference and posts results back
 *   4. This service manages the WebView ref and message bridge
 *
 * @see assets/ml/yolo_inference.html for the inference runtime
 * @see assets/ml/metadata.yaml for model details
 */

import { File } from 'expo-file-system';
import { resolveModelUri } from '@/src/services/modelResolver';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Detection {
  classId: number;
  className: string;
  confidence: number;
  /** [x, y, width, height] in normalized coordinates (0–1) */
  bbox: [number, number, number, number];
}

export interface YOLOMessage {
  type: 'ready' | 'model-loaded' | 'model-error' | 'inference-result' | 'inference-error';
  detections?: Detection[];
  error?: string;
}

// ── State ──────────────────────────────────────────────────────────────────

let _webViewRef: any = null;
let _pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
let _requestId = 0;

// ── WebView Management ────────────────────────────────────────────────────

/**
 * Register the WebView ref so this service can communicate with it.
 * Called from the scanner screen when it renders the hidden WebView.
 * A new WebView means a fresh runtime, so reset the loaded/model state.
 */
export function setWebViewRef(ref: any): void {
  _webViewRef = ref;
  if (ref) {
    _modelLoaded = false;
  }
}

/**
 * Send a message to the inference WebView and wait for a response.
 */
function postMessage(message: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `req_${_requestId++}`;
    _pendingRequests.set(id, { resolve, reject });
    _webViewRef?.postMessage(JSON.stringify({ ...message, _id: id }));

    // Timeout after 30s
    setTimeout(() => {
      if (_pendingRequests.has(id)) {
        _pendingRequests.delete(id);
        reject(new Error('Inference request timed out'));
      }
    }, 30000);
  });
}

/**
 * Handle messages received from the WebView.
 * Called from the scanner screen's onMessage handler.
 */
export function handleWebViewMessage(event: any): void {
  try {
    const data = JSON.parse(event.nativeEvent?.data || event.data);
    const { _id, type, ...payload } = data;

    if (_id && _pendingRequests.has(_id)) {
      const { resolve, reject } = _pendingRequests.get(_id)!;
      _pendingRequests.delete(_id);
      if (type === 'error' || type?.includes('error')) {
        reject(new Error(payload.error || 'Unknown error'));
      } else {
        resolve(payload);
      }
    }
  } catch {
    // Ignore malformed messages
  }
}

// ── Model Loading ─────────────────────────────────────────────────────────

let _modelLoaded = false;

/**
 * Reads the TFLite model file and sends it to the WebView for loading.
 * Falls back gracefully if WebView is not available.
 */
export async function loadModel(): Promise<void> {
  if (_modelLoaded) return;

  if (!_webViewRef) {
    console.warn('YOLO: WebView ref not set. Inference not available.');
    return;
  }

  try {
    // require() of a .tflite returns a Metro asset module id (a number), not a
    // file URI — resolve it to a local file first, then read it as base64.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro assets require a static require() call
    const modelAsset: number = require('@/assets/ml/best_int8.tflite');
    const modelUri = await resolveModelUri(modelAsset);
    const modelBase64 = await new File(modelUri).base64();

    if (!modelBase64) {
      throw new Error('Could not read model file');
    }

    await postMessage({
      type: 'load-model',
      modelData: `data:model/tflite;base64,${modelBase64}`,
    });

    _modelLoaded = true;
  } catch (error) {
    console.warn('YOLO: Failed to load model:', (error as Error).message);
    throw error;
  }
}

// ── Inference ──────────────────────────────────────────────────────────────

/**
 * Runs inference on a captured image.
 * Sends the image as base64 to the WebView for processing.
 *
 * @param imageUri — Local URI of the captured image
 * @returns Array of detections
 */
export async function processImage(imageUri: string): Promise<Detection[]> {
  if (!_webViewRef) {
    console.warn('YOLO: WebView ref not set. Returning empty detections.');
    return [];
  }

  try {
    // Read image as base64 using new expo-file-system API
    const imageBase64 = await new File(imageUri).base64();

    if (!imageBase64) {
      throw new Error('Could not read image file');
    }

    const result = await postMessage({
      type: 'run-inference',
      imageData: `data:image/jpeg;base64,${imageBase64}`,
    });

    return result.detections ?? [];
  } catch (error) {
    console.warn('YOLO: Inference failed:', (error as Error).message);
    // Propagate so callers can distinguish a real failure from an empty
    // detection set (a false "no conditions found").
    throw error;
  }
}
