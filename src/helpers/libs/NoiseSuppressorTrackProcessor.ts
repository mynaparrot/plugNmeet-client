import type { AudioProcessorOptions, LocalAudioTrack, Track, TrackProcessor } from 'livekit-client';
import type { GtcrnWorkletNode } from '@sapphi-red/web-noise-suppressor';

import { getConfigValue } from '../utils';

/**
 * Minimal, unmodified GTCRN noise suppression exposed as a LiveKit audio
 * `TrackProcessor`.
 *
 * All of the DSP lives in the upstream `@sapphi-red/web-noise-suppressor`
 * worklet + wasm (served straight from the installed package by Vite's static
 * copy). This file only wires that worklet to a `LocalAudioTrack`, runs it on
 * the SDK's own `AudioContext` and stops the browser's own suppression from
 * stacking on top of it.
 *
 * Asynchronous failures raised inside the AudioWorklet global scope are not
 * observable from the main thread; only the reachable ones (asset loading,
 * unsupported context) are turned into an `enable` failure. The worklet node's
 * standard `processorerror` event is forwarded as a best-effort fallback.
 */
export const NOISE_SUPPRESSOR_PROCESSOR_NAME = 'pnm-gtcrn-noise-suppressor';

const GTCRN_MAX_CHANNELS = 2;
/** GTCRN's worklet only accepts 16 kHz or 48 kHz input. */
const SUPPORTED_SAMPLE_RATES = new Set([16000, 48000]);
/**
 * GTCRN's model runs at 16 kHz mono, so when the SDK context isn't supported we
 * run the worklet on a dedicated 16 kHz context instead of resampling 48↔16 kHz.
 */
const FALLBACK_SAMPLE_RATE = 16000;

const assetPath = getConfigValue('staticAssetsPath', '/assets', 'STATIC_ASSETS_PATH');
const workletUrl = `${assetPath}/wasm/gtcrn-worklet.js`;
const wasmUrl = `${assetPath}/wasm/gtcrn.wasm`;

/** Whether this browser can run the GTCRN AudioWorklet at all. */
export const isNoiseSuppressorSupported = (): boolean =>
  typeof AudioContext !== 'undefined' &&
  typeof AudioWorkletNode !== 'undefined' &&
  'audioWorklet' in AudioContext.prototype;

// The library and its wasm are loaded at most once and retried after a failure.
let libraryPromise: Promise<typeof import('@sapphi-red/web-noise-suppressor')> | null = null;
const loadLibrary = () => {
  if (!libraryPromise) {
    libraryPromise = import('@sapphi-red/web-noise-suppressor').catch((e) => {
      libraryPromise = null;
      throw e;
    });
  }
  return libraryPromise;
};

let wasmPromise: Promise<ArrayBuffer> | null = null;
const loadWasm = async () => {
  const { loadGtcrn } = await loadLibrary();
  if (!wasmPromise) {
    wasmPromise = loadGtcrn({ url: wasmUrl }).catch((e) => {
      wasmPromise = null;
      throw e;
    });
  }
  return wasmPromise;
};

// `audioWorklet.addModule` is cached per context and dropped again on failure.
const workletModulePromises = new WeakMap<AudioContext, Promise<void>>();
const ensureWorkletModule = (ctx: AudioContext) => {
  let promise = workletModulePromises.get(ctx);
  if (!promise) {
    promise = ctx.audioWorklet.addModule(workletUrl).catch((e) => {
      workletModulePromises.delete(ctx);
      throw e;
    });
    workletModulePromises.set(ctx, promise);
  }
  return promise;
};

/** `getConstraints()` can throw on an already-ended track; treat that as "none". */
const readConstraints = (track: MediaStreamTrack): MediaTrackConstraints => {
  try {
    return track.getConstraints();
  } catch {
    return {};
  }
};

/**
 * Folds a replacement track's device into the captured originals so a later
 * restore targets the *current* device, without trusting the replacement's own
 * suppression flags (which may already read `false`).
 */
const withDeviceId = (
  original: MediaTrackConstraints | null,
  incoming: MediaTrackConstraints,
): MediaTrackConstraints => {
  if (!original) {
    return incoming;
  }
  return incoming.deviceId !== undefined ? { ...original, deviceId: incoming.deviceId } : original;
};

class NoiseSuppressorTrackProcessor implements TrackProcessor<
  Track.Kind.Audio,
  AudioProcessorOptions
> {
  name = NOISE_SUPPRESSOR_PROCESSOR_NAME;

  processedTrack?: MediaStreamTrack;

  private audioContext: AudioContext | null = null;
  /** True only when `audioContext` is our fallback, so `destroy()` may close it. */
  private ownsAudioContext = false;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: GtcrnWorkletNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  private rawTrack: MediaStreamTrack | null = null;
  private originalConstraints: MediaTrackConstraints | null = null;
  private suppressed = false;
  private processorErrorHandler: (() => void) | null = null;

  constructor(private readonly onProcessorError?: () => void) {}

  async init(opts: AudioProcessorOptions) {
    try {
      await this.buildGraph(opts);
    } catch (e) {
      // A partial init must never leak an owned fallback context or half-built
      // graph. destroy() is idempotent, so a caller may still tear down again.
      await this.destroy();
      throw e;
    }
  }

  private async buildGraph(opts: AudioProcessorOptions) {
    const sdkContext = opts.audioContext;
    if (!sdkContext) {
      throw new Error('GTCRN noise suppression requires the SDK audio context');
    }

    if (SUPPORTED_SAMPLE_RATES.has(sdkContext.sampleRate)) {
      this.audioContext = sdkContext;
      this.ownsAudioContext = false;
    } else {
      const fallbackCtx = new AudioContext({
        latencyHint: 'interactive',
        sampleRate: FALLBACK_SAMPLE_RATE,
      });
      // Claim the fallback before any later step can throw so a failed init
      // always closes it through destroy() instead of leaking it.
      this.audioContext = fallbackCtx;
      this.ownsAudioContext = true;
      if (!SUPPORTED_SAMPLE_RATES.has(fallbackCtx.sampleRate)) {
        throw new Error(
          `GTCRN noise suppression needs a 16 kHz or 48 kHz audio context (got ${fallbackCtx.sampleRate} Hz)`,
        );
      }
    }

    const ctx = this.audioContext;
    this.rawTrack = opts.track;
    this.originalConstraints = readConstraints(opts.track);

    const { GtcrnWorkletNode: WorkletNode } = await loadLibrary();
    const wasmBinary = await loadWasm();
    await ensureWorkletModule(ctx);

    const node = new WorkletNode(ctx, {
      maxChannels: GTCRN_MAX_CHANNELS,
      wasmBinary,
    });
    this.workletNode = node;
    if (this.onProcessorError) {
      // Guarded by node identity so an error from a replaced or already
      // torn-down node can't disable whichever processor is now on the track.
      this.processorErrorHandler = () => {
        if (this.workletNode === node) {
          this.onProcessorError?.();
        }
      };
      node.addEventListener('processorerror', this.processorErrorHandler);
    }
    this.destinationNode = ctx.createMediaStreamDestination();
    this.sourceNode = ctx.createMediaStreamSource(new MediaStream([opts.track]));

    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.destinationNode);

    this.processedTrack = this.destinationNode.stream.getAudioTracks()[0];

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Only disable browser-side suppression once the graph is live, so an
    // unsupported context or an asset failure leaves the capture untouched.
    await this.disableBrowserSuppression();
  }

  async restart(opts: AudioProcessorOptions) {
    // Rebuild when the graph is gone, or when the SDK moved to a context we
    // can't keep using: a supported SDK context while we're on our owned 16 kHz
    // fallback, or a different SDK context while we're already on the SDK's own.
    const shouldSwitchContext = Boolean(
      opts.audioContext &&
      (this.ownsAudioContext
        ? SUPPORTED_SAMPLE_RATES.has(opts.audioContext.sampleRate)
        : opts.audioContext !== this.audioContext),
    );
    if (!this.audioContext || !this.workletNode || !this.destinationNode || shouldSwitchContext) {
      // destroy() restores the browser's own suppression on the live track first
      // so init() re-reads and re-disables cleanly, and closes any owned fallback
      // context as the graph moves to the new context.
      await this.destroy();
      await this.init(opts);
      return;
    }

    const isSameTrack = opts.track === this.rawTrack;
    if (!isSameTrack) {
      // Reuse the captured originals across device switches so enabled
      // constraints (echo cancellation, AGC, …) survive, and never mistake the
      // replacement track's already-disabled flags for the originals.
      this.originalConstraints = withDeviceId(
        this.originalConstraints,
        readConstraints(opts.track),
      );
      this.rawTrack = opts.track;
    }

    // Reconnect the new source track to the existing graph so the processed
    // track (and the sender's binding to it) stays stable across a device swap.
    this.disconnectSource();
    try {
      this.sourceNode = this.audioContext.createMediaStreamSource(new MediaStream([opts.track]));
      this.sourceNode.connect(this.workletNode);
      if (!isSameTrack) {
        await this.disableBrowserSuppression();
      }
    } catch (e) {
      // Never leave a half-wired source hanging off the reused graph.
      this.disconnectSource();
      throw e;
    }
  }

  async destroy() {
    try {
      this.disconnectSource();

      if (this.workletNode) {
        const node = this.workletNode;
        const handler = this.processorErrorHandler;
        this.workletNode = null;
        this.processorErrorHandler = null;
        try {
          if (handler) {
            node.removeEventListener('processorerror', handler);
          }
          node.disconnect();
          node.destroy();
        } catch {
          // already torn down
        }
      }

      if (this.destinationNode) {
        try {
          this.destinationNode.disconnect();
        } catch {
          // already torn down
        }
        this.destinationNode = null;
      }

      this.processedTrack?.stop();
      this.processedTrack = undefined;

      await this.restoreBrowserSuppression();
    } catch (e) {
      console.error('Failed to tear down GTCRN noise suppression', e);
    }

    // Only close a context we created; the SDK's context is never ours to close.
    if (this.ownsAudioContext && this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {
        // already closed
      }
    }
    this.ownsAudioContext = false;
    this.audioContext = null;
  }

  private disconnectSource() {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // already disconnected
      }
      this.sourceNode = null;
    }
  }

  /**
   * Turns off browser noise suppression / voice isolation on the raw capture
   * track. `applyConstraints` replaces the whole constraint set, so the full
   * original is spread back in first to keep echo cancellation, AGC and the
   * selected device intact.
   */
  private async disableBrowserSuppression() {
    const track = this.rawTrack;
    if (!track || track.readyState !== 'live') {
      return;
    }

    // If the browser refuses to turn its own suppression off, GTCRN would end up
    // stacked on top of it; let the rejection surface as an enable failure so
    // the caller tears the candidate graph down with the originals left as-is.
    await track.applyConstraints({
      ...this.originalConstraints,
      noiseSuppression: false,
      voiceIsolation: false,
    } as MediaTrackConstraints);
    this.suppressed = true;
  }

  /**
   * Restores the full original constraint set (including an empty one, which
   * resets any field we added). Nothing is touched if suppression was never
   * actually disabled. The raw capture track is never stopped and the SDK
   * context is never closed here.
   */
  private async restoreBrowserSuppression() {
    const track = this.rawTrack;
    const original = this.originalConstraints;
    const wasSuppressed = this.suppressed;
    this.rawTrack = null;
    this.originalConstraints = null;
    this.suppressed = false;

    if (!wasSuppressed || !track || track.readyState !== 'live') {
      return;
    }

    try {
      await track.applyConstraints(original ?? {});
    } catch (e) {
      console.warn('Failed to restore original microphone constraints', e);
    }
  }
}

/**
 * Attaches GTCRN to a local audio track. Returns false when the processor could
 * not be started; a partially attached candidate is always torn down so nothing
 * leaks. `onProcessorError` is invoked if the worklet reports `processorerror`.
 */
export const enableNoiseSuppressor = async (
  track: LocalAudioTrack,
  onProcessorError?: () => void,
): Promise<boolean> => {
  const processor = new NoiseSuppressorTrackProcessor(onProcessorError);
  try {
    await track.setProcessor(processor);
    return true;
  } catch (e) {
    console.error('Failed to enable GTCRN noise suppression', e);
    if (track.getProcessor() === processor) {
      // The SDK attached the processor (and possibly swapped the sender) before
      // the failure, so it has to be stopped through the SDK.
      try {
        await track.stopProcessor();
      } catch (stopError) {
        console.warn('Failed to stop the failed GTCRN processor', stopError);
      }
    } else {
      // init() failed before attachment; the SDK won't clean the candidate up.
      await processor.destroy();
    }
    return false;
  }
};

/** Detaches GTCRN. Returns false (instead of swallowing) when the SDK refuses. */
export const disableNoiseSuppressor = async (track: LocalAudioTrack): Promise<boolean> => {
  if (track.getProcessor()?.name !== NOISE_SUPPRESSOR_PROCESSOR_NAME) {
    return true;
  }
  try {
    await track.stopProcessor();
    return true;
  } catch (e) {
    console.error('Failed to stop GTCRN noise suppression', e);
    return false;
  }
};

/**
 * Applies the requested suppression state to a live track. After a successful
 * enable the caller can pass `isCurrent` to re-check that the track is still the
 * published mic; if it was removed/replaced meanwhile the fresh processor is
 * detached again so its graph cannot leak.
 */
export const applyNoiseSuppressorState = async (
  track: LocalAudioTrack,
  desired: boolean,
  isCurrent: () => boolean = () => true,
  onProcessorError?: () => void,
): Promise<boolean> => {
  if (!desired) {
    return disableNoiseSuppressor(track);
  }

  const attached = await enableNoiseSuppressor(track, onProcessorError);
  if (!attached) {
    return false;
  }
  if (!isCurrent()) {
    await disableNoiseSuppressor(track);
    return false;
  }
  return true;
};

// Run during application bootup and cache, so the first enable after joining
// doesn't wait on the wasm download. This is best-effort: `loadWasm` clears its
// cache on failure so the next enable retries, and the rejection is swallowed
// here so a failed preload can't surface as an unhandled rejection.
if (isNoiseSuppressorSupported()) {
  void loadWasm().catch(() => {});
}
