/**
 * Three.js configuration for React Native compatibility.
 * Minimal setup — Worker mock if needed.
 */

if (typeof globalThis.Worker === 'undefined') {
  class MinimalWorker {
    postMessage() {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
    onmessage: any = null;
    onerror: any = null;
  }
  (globalThis as any).Worker = MinimalWorker;
}

export function configureThree() {}
