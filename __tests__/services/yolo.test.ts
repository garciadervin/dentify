import {
  setWebViewRef,
  handleWebViewMessage,
  processImage,
} from '@/src/services/yolo';

describe('yolo service', () => {
  afterEach(() => {
    setWebViewRef(null);
    jest.useRealTimers();
  });

  it('processImage rethrows an inference error instead of returning empty detections', async () => {
    jest.useFakeTimers();
    let lastId = '';
    const ref = {
      postMessage: jest.fn((msg: string) => {
        lastId = (JSON.parse(msg) as { _id: string })._id;
      }),
    };
    setWebViewRef(ref as any);

    let captured: unknown;
    const pending = processImage('file:///capture.jpg');
    pending.catch((e: unknown) => {
      captured = e;
    });

    // Let the async File().base64() read resolve and post the request (microtasks
    // run normally under fake timers), then fail the pending request.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(ref.postMessage).toHaveBeenCalledTimes(1);

    handleWebViewMessage({
      nativeEvent: { data: JSON.stringify({ _id: lastId, type: 'error', error: 'inference boom' }) },
    });

    await pending.catch(() => undefined);
    expect(captured).toBeDefined();
    expect((captured as Error)?.message).toBe('inference boom');

    // Flush the 30 s fallback timer postMessage scheduled so the worker exits cleanly.
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('handleWebViewMessage ignores unknown ids and malformed payloads', () => {
    expect(() =>
      handleWebViewMessage({ nativeEvent: { data: JSON.stringify({ _id: 'req_unknown', type: 'error' }) } })
    ).not.toThrow();
    expect(() => handleWebViewMessage({ nativeEvent: { data: 'not json' } })).not.toThrow();
    expect(() => handleWebViewMessage({})).not.toThrow();
  });
});
