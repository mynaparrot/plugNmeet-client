import { vi } from 'vitest';

/**
 * Lightweight Node stand-ins for the browser audio objects the GTCRN processor
 * touches. Deliberately not jsdom — the processor only needs a handful of audio
 * surface, so plain objects keep the tests fast and explicit.
 */

export interface FakeRawTrack {
  getConstraints: ReturnType<typeof vi.fn>;
  applyConstraints: ReturnType<typeof vi.fn>;
  readyState: MediaStreamTrackState;
}

export const createRawTrack = (
  constraints: Record<string, unknown> = {},
  readyState: MediaStreamTrackState = 'live',
): FakeRawTrack => ({
  getConstraints: vi.fn(() => constraints),
  applyConstraints: vi.fn(async () => {}),
  readyState,
});

export class FakeAudioContext {
  /** Every constructed context, so tests can find the processor's fallback. */
  static instances: FakeAudioContext[] = [];

  sampleRate: number;
  state: AudioContextState = 'running';
  resume = vi.fn(async () => {});
  addModule = vi.fn(async () => {});
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  sourceNode = { connect: vi.fn(), disconnect: vi.fn() };
  processedTrack = { stop: vi.fn() };
  destinationNode = {
    disconnect: vi.fn(),
    stream: { getAudioTracks: () => [this.processedTrack] },
  };

  constructor(optionsOrRate: number | AudioContextOptions = 48000) {
    this.sampleRate =
      typeof optionsOrRate === 'number' ? optionsOrRate : (optionsOrRate.sampleRate ?? 48000);
    FakeAudioContext.instances.push(this);
  }

  /** On the prototype so `'audioWorklet' in AudioContext.prototype` is true. */
  get audioWorklet() {
    return { addModule: this.addModule };
  }

  createMediaStreamSource() {
    return this.sourceNode;
  }

  createMediaStreamDestination() {
    return this.destinationNode;
  }
}

/**
 * Drains pending microtasks and macrotask ticks so asynchronous work that is
 * fired and not awaited — the module-level boot preload's dynamic import and
 * wasm fetch — has settled before assertions run.
 */
export const flushPromises = async (): Promise<void> => {
  for (let i = 0; i < 3; i += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
};

/** Installs the browser globals the processor (and its support check) relies on. */
export const installAudioGlobals = () => {
  FakeAudioContext.instances.length = 0;
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('AudioWorkletNode', {});
  vi.stubGlobal(
    'MediaStream',
    class {
      constructor(public readonly tracks: unknown[]) {}
    },
  );
};
