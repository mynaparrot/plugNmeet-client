import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FakeAudioContext,
  createRawTrack,
  flushPromises,
  installAudioGlobals,
} from './noiseSuppressorHarness';

// `helpers/utils` boots i18next/config and the app store at import time; the
// processor only needs `getConfigValue`, so stub that one export away.
vi.mock('../../utils', () => ({
  getConfigValue: (_key: string, defaultValue: unknown) => defaultValue,
}));

const library = vi.hoisted(() => {
  const loadGtcrn = vi.fn(async () => new ArrayBuffer(16));
  const nodes: Array<{
    emit: (type: string) => void;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  }> = [];

  class GtcrnWorkletNode {
    connect = vi.fn();
    disconnect = vi.fn();
    destroy = vi.fn();
    private listeners: Record<string, Array<(event: unknown) => void>> = {};

    constructor(
      public readonly context: unknown,
      public readonly options: unknown,
    ) {
      nodes.push(this);
    }

    addEventListener(type: string, callback: (event: unknown) => void) {
      (this.listeners[type] ??= []).push(callback);
    }

    removeEventListener = vi.fn((type: string, callback: (event: unknown) => void) => {
      const list = this.listeners[type];
      if (list) {
        this.listeners[type] = list.filter((entry) => entry !== callback);
      }
    });

    emit(type: string) {
      (this.listeners[type] ?? []).forEach((callback) => callback({}));
    }
  }

  return { loadGtcrn, nodes, GtcrnWorkletNode };
});

vi.mock('@sapphi-red/web-noise-suppressor', () => ({
  loadGtcrn: library.loadGtcrn,
  GtcrnWorkletNode: library.GtcrnWorkletNode,
}));

/**
 * Imports a fresh adapter (its module-level asset caches start empty) and waits
 * for the boot preload it kicks off, so call counts are settled before asserts.
 */
const bootAdapter = async () => {
  vi.resetModules();
  const adapter = await import('../NoiseSuppressorTrackProcessor');
  await flushPromises();
  return adapter;
};

/** Stand-in for the SDK's `LocalAudioTrack` that mirrors setProcessor wiring. */
const createSdkTrack = (
  rawTrack: unknown,
  options: { audioContext?: unknown; failAfterAttach?: boolean } = {},
): any => {
  const track: any = {
    _processor: undefined as unknown,
    getProcessor: () => track._processor,
    setProcessor: vi.fn(async (processor: any) => {
      await processor.init({
        track: rawTrack,
        kind: 'audio',
        audioContext: options.audioContext,
        element: undefined,
        localTrack: track,
      });
      track._processor = processor;
      if (options.failAfterAttach) {
        throw new Error('sender.replaceTrack rejected');
      }
    }),
    stopProcessor: vi.fn(async () => {
      await track._processor?.destroy();
      track._processor = undefined;
    }),
  };
  return track;
};

beforeEach(() => {
  installAudioGlobals();
  library.nodes.length = 0;
  library.loadGtcrn.mockReset();
  library.loadGtcrn.mockImplementation(async () => new ArrayBuffer(16));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('capture constraint lifecycle', () => {
  it('disables browser suppression on enable while preserving the full capture set', async () => {
    const adapter = await bootAdapter();
    const raw = createRawTrack({
      echoCancellation: true,
      autoGainControl: true,
      sampleRate: 48000,
      noiseSuppression: true,
      deviceId: 'dev-1',
    });
    const track = createSdkTrack(raw, { audioContext: new FakeAudioContext() });

    expect(await adapter.enableNoiseSuppressor(track)).toBe(true);
    expect(raw.applyConstraints).toHaveBeenLastCalledWith({
      echoCancellation: true,
      autoGainControl: true,
      sampleRate: 48000,
      noiseSuppression: false,
      voiceIsolation: false,
      deviceId: 'dev-1',
    });
  });

  it.each<[string, Record<string, unknown>]>([
    [
      'the complete original set',
      {
        echoCancellation: true,
        autoGainControl: true,
        sampleRate: 48000,
        noiseSuppression: true,
        deviceId: 'dev-1',
      },
    ],
    ['explicit false values', { noiseSuppression: false, voiceIsolation: false }],
    ['an originally-empty set', {}],
  ])('restores %s verbatim on disable', async (_label, original) => {
    const adapter = await bootAdapter();
    const raw = createRawTrack(original);
    const track = createSdkTrack(raw, { audioContext: new FakeAudioContext() });

    expect(await adapter.enableNoiseSuppressor(track)).toBe(true);
    await adapter.disableNoiseSuppressor(track);

    expect(raw.applyConstraints).toHaveBeenLastCalledWith(original);
  });

  it('never touches the capture track when it has already ended', async () => {
    const adapter = await bootAdapter();
    const raw = createRawTrack({ echoCancellation: true, noiseSuppression: true }, 'ended');
    const track = createSdkTrack(raw, { audioContext: new FakeAudioContext() });

    expect(await adapter.enableNoiseSuppressor(track)).toBe(true);
    await adapter.disableNoiseSuppressor(track);

    expect(library.nodes).toHaveLength(1);
    expect(raw.applyConstraints).not.toHaveBeenCalled();
  });
});

describe('failed enable cleanup', () => {
  it.each<[string, unknown]>([
    ['a missing SDK audio context', undefined],
    ['an unsupported sample rate', new FakeAudioContext(44100)],
  ])('rejects %s before loading assets or touching capture', async (_label, audioContext) => {
    const adapter = await bootAdapter();
    const raw = createRawTrack({ echoCancellation: true, noiseSuppression: true });
    const track = createSdkTrack(raw, { audioContext });

    expect(await adapter.enableNoiseSuppressor(track)).toBe(false);
    expect(track.getProcessor()).toBeUndefined();
    expect(track.stopProcessor).not.toHaveBeenCalled();
    expect(raw.applyConstraints).not.toHaveBeenCalled();
    expect(library.nodes).toHaveLength(0);
    // Only the boot preload may have loaded assets.
    expect(library.loadGtcrn).toHaveBeenCalledTimes(1);
  });

  it('leaves capture untouched and tears down the graph when the assets fail to load', async () => {
    library.loadGtcrn.mockRejectedValue(new Error('offline'));
    const adapter = await bootAdapter();
    const raw = createRawTrack({ echoCancellation: true, noiseSuppression: true });
    const track = createSdkTrack(raw, { audioContext: new FakeAudioContext() });

    expect(await adapter.enableNoiseSuppressor(track)).toBe(false);
    expect(track.getProcessor()).toBeUndefined();
    expect(raw.applyConstraints).not.toHaveBeenCalled();
  });

  it('tears down the half-built graph when browser suppression cannot be disabled', async () => {
    const adapter = await bootAdapter();
    const raw = createRawTrack({ echoCancellation: true, noiseSuppression: true });
    raw.applyConstraints.mockRejectedValueOnce(new Error('OverconstrainedError'));
    const track = createSdkTrack(raw, { audioContext: new FakeAudioContext() });

    expect(await adapter.enableNoiseSuppressor(track)).toBe(false);
    expect(track.getProcessor()).toBeUndefined();
    // The candidate graph is always cleaned up, and only the rejected attempt ran.
    expect(library.nodes[0].destroy).toHaveBeenCalledTimes(1);
    expect(raw.applyConstraints).toHaveBeenCalledTimes(1);
  });

  it('stops a processor the SDK attached before a later failure', async () => {
    const adapter = await bootAdapter();
    const raw = createRawTrack({ echoCancellation: true, noiseSuppression: true });
    const track = createSdkTrack(raw, {
      audioContext: new FakeAudioContext(),
      failAfterAttach: true,
    });

    expect(await adapter.enableNoiseSuppressor(track)).toBe(false);
    expect(track.stopProcessor).toHaveBeenCalledTimes(1);
    expect(track.getProcessor()).toBeUndefined();
    // Tearing the failed processor down restores the originals again.
    expect(raw.applyConstraints).toHaveBeenLastCalledWith({
      echoCancellation: true,
      noiseSuppression: true,
    });
  });
});

describe('device switch and restart', () => {
  it('keeps the captured originals when the same raw track is restarted', async () => {
    const adapter = await bootAdapter();
    const original = {
      echoCancellation: true,
      autoGainControl: true,
      noiseSuppression: true,
      deviceId: 'dev-1',
    };
    const raw = createRawTrack(original);
    const track = createSdkTrack(raw, { audioContext: new FakeAudioContext() });

    expect(await adapter.enableNoiseSuppressor(track)).toBe(true);
    await track.getProcessor().restart({ track: raw, kind: 'audio' });

    // No re-disable: the same track's constraints are already turned off.
    expect(raw.applyConstraints).toHaveBeenCalledTimes(1);

    await adapter.disableNoiseSuppressor(track);
    expect(raw.applyConstraints).toHaveBeenLastCalledWith(original);
  });

  it('adopts a replacement device without trusting its suppression flags', async () => {
    const adapter = await bootAdapter();
    const ctx = new FakeAudioContext();
    const first = createRawTrack({
      echoCancellation: true,
      autoGainControl: true,
      noiseSuppression: true,
      deviceId: 'dev-1',
    });
    const track = createSdkTrack(first, { audioContext: ctx });
    expect(await adapter.enableNoiseSuppressor(track)).toBe(true);

    // A switch can hand us a track whose flags already read false.
    const second = createRawTrack({ noiseSuppression: false, deviceId: 'dev-2' });
    await track.getProcessor().restart({ track: second, kind: 'audio' });

    expect(second.applyConstraints).toHaveBeenLastCalledWith({
      echoCancellation: true,
      autoGainControl: true,
      noiseSuppression: false,
      voiceIsolation: false,
      deviceId: 'dev-2',
    });

    await adapter.disableNoiseSuppressor(track);
    expect(second.applyConstraints).toHaveBeenLastCalledWith({
      echoCancellation: true,
      autoGainControl: true,
      noiseSuppression: true,
      deviceId: 'dev-2',
    });
  });
});

describe('asset preload', () => {
  it('preloads once at import and reuses the caches across enables and contexts', async () => {
    const adapter = await bootAdapter();

    expect(adapter.isNoiseSuppressorSupported()).toBe(true);
    expect(library.loadGtcrn).toHaveBeenCalledTimes(1);

    const ctxA = new FakeAudioContext();
    const ctxB = new FakeAudioContext();
    expect(
      await adapter.enableNoiseSuppressor(createSdkTrack(createRawTrack(), { audioContext: ctxA })),
    ).toBe(true);
    expect(
      await adapter.enableNoiseSuppressor(createSdkTrack(createRawTrack(), { audioContext: ctxB })),
    ).toBe(true);

    // The wasm is fetched once; the worklet module is added once per context.
    expect(library.loadGtcrn).toHaveBeenCalledTimes(1);
    expect(ctxA.addModule).toHaveBeenCalledTimes(1);
    expect(ctxB.addModule).toHaveBeenCalledTimes(1);
  });

  it('retries the wasm fetch after a failed preload', async () => {
    library.loadGtcrn.mockRejectedValueOnce(new Error('offline'));
    const adapter = await bootAdapter();
    expect(library.loadGtcrn).toHaveBeenCalledTimes(1);

    const track = createSdkTrack(createRawTrack(), { audioContext: new FakeAudioContext() });
    expect(await adapter.enableNoiseSuppressor(track)).toBe(true);
    expect(library.loadGtcrn).toHaveBeenCalledTimes(2);
  });

  it('skips the preload when AudioWorklet is unsupported', async () => {
    vi.stubGlobal('AudioWorkletNode', undefined);
    const adapter = await bootAdapter();

    expect(adapter.isNoiseSuppressorSupported()).toBe(false);
    expect(library.loadGtcrn).not.toHaveBeenCalled();
  });
});

describe('teardown and error handling', () => {
  it('forwards a worklet processorerror to the fallback callback', async () => {
    const adapter = await bootAdapter();
    const onProcessorError = vi.fn();
    const track = createSdkTrack(createRawTrack(), { audioContext: new FakeAudioContext() });

    expect(await adapter.enableNoiseSuppressor(track, onProcessorError)).toBe(true);
    library.nodes[0].emit('processorerror');
    expect(onProcessorError).toHaveBeenCalledTimes(1);
  });

  it('drops the processorerror listener on destroy so a stale node cannot fire', async () => {
    const adapter = await bootAdapter();
    const onProcessorError = vi.fn();
    const track = createSdkTrack(createRawTrack(), { audioContext: new FakeAudioContext() });

    expect(await adapter.enableNoiseSuppressor(track, onProcessorError)).toBe(true);
    const node = library.nodes[0];

    await adapter.disableNoiseSuppressor(track);
    expect(node.removeEventListener).toHaveBeenCalledWith('processorerror', expect.any(Function));

    node.emit('processorerror');
    expect(onProcessorError).not.toHaveBeenCalled();
  });

  it('detaches the fresh processor when the mic was replaced mid-apply', async () => {
    const adapter = await bootAdapter();
    const track = createSdkTrack(createRawTrack(), { audioContext: new FakeAudioContext() });

    expect(await adapter.applyNoiseSuppressorState(track, true, () => false)).toBe(false);
    expect(track.stopProcessor).toHaveBeenCalledTimes(1);
    expect(track.getProcessor()).toBeUndefined();
  });

  it('reports failure instead of swallowing a stopProcessor error', async () => {
    const adapter = await bootAdapter();
    const track: any = {
      getProcessor: () => ({ name: adapter.NOISE_SUPPRESSOR_PROCESSOR_NAME }),
      stopProcessor: vi.fn(async () => {
        throw new Error('stop failed');
      }),
    };

    expect(await adapter.disableNoiseSuppressor(track)).toBe(false);
  });

  it('is a no-op when a different processor is attached', async () => {
    const adapter = await bootAdapter();
    const track: any = {
      getProcessor: () => ({ name: 'some-other-processor' }),
      stopProcessor: vi.fn(),
    };

    expect(await adapter.disableNoiseSuppressor(track)).toBe(true);
    expect(track.stopProcessor).not.toHaveBeenCalled();
  });
});
