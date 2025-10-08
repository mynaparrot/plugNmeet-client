import { throttle } from 'es-toolkit';

// --- Configuration ---
const SPEAKING_THRESHOLD = 0.04;
const SILENCE_THRESHOLD = 0.02;
// Delay to prevent the speaking indicator from flickering during natural pauses.
const STOP_SPEAKING_DELAY = 1000;
// How often to send audioLevel updates while speaking (e.g., 1 time per second)
const AUDIO_LEVEL_UPDATE_THROTTLE = 1000;

export interface AudioActivity {
  isSpeaking: boolean;
  audioLevel: number;
  lastSpokeAt: number;
}

type SubscriberCallback = (activity: AudioActivity) => void;

interface TrackProcessor {
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  dataArray: Uint8Array;
  stopTimer?: ReturnType<typeof setTimeout>; // Re-introduced for robust stop detection
  lastKnownSpeakingState: boolean;
  lastSpokeAt: number;
  callback: SubscriberCallback;
  // A throttled function for this specific track to send continuous audio levels
  throttledUpdateCallback: ReturnType<typeof throttle>;
}

/**
 * A singleton class to centrally manage and process audio activity for all MediaStreams.
 * This prevents creating multiple AudioContexts and animation loops.
 * It is library-agnostic and operates directly on the standard MediaStream API.
 */
class AudioActivityManager {
  private readonly audioContext: AudioContext;
  private tracks = new Map<string, TrackProcessor>();
  private animationFrameId?: number;

  constructor() {
    // This class is a singleton and should only be used in the browser.
    if (typeof window === 'undefined' || !window.AudioContext) {
      // In a non-browser environment (like SSR), do nothing.
      this.audioContext = null as any;
      return;
    }
    this.audioContext = new AudioContext();
    this.startLoop();
  }

  private startLoop = () => {
    this.tracks.forEach((processor) => {
      const { analyser, dataArray, throttledUpdateCallback } = processor;
      analyser.getByteTimeDomainData(dataArray as any);

      let sumSquares = 0.0;
      for (const amplitude of dataArray) {
        const a = amplitude / 128.0 - 1.0;
        sumSquares += a * a;
      }
      const volume = Math.sqrt(sumSquares / dataArray.length);

      if (volume > SPEAKING_THRESHOLD) {
        // If the user starts speaking, cancel any pending "stop" timers.
        if (processor.stopTimer) {
          clearTimeout(processor.stopTimer);
          processor.stopTimer = undefined;
        }

        // Set the state and call the throttled function for "speaking" updates.
        processor.lastKnownSpeakingState = true;
        processor.lastSpokeAt = Date.now();
        throttledUpdateCallback(volume, processor.lastSpokeAt);
      } else if (volume < SILENCE_THRESHOLD) {
        // If the user is silent, and we haven't already scheduled a "stop" event...
        if (processor.lastKnownSpeakingState && !processor.stopTimer) {
          // Cancel any pending throttled "speaking" updates.
          throttledUpdateCallback.cancel();
          // ...schedule the "stop" event after a delay.
          processor.stopTimer = setTimeout(() => {
            processor.lastKnownSpeakingState = false;
            processor.callback({
              isSpeaking: false,
              audioLevel: 0, // Volume is negligible when stopped.
              lastSpokeAt: processor.lastSpokeAt,
            });
            processor.stopTimer = undefined;
          }, STOP_SPEAKING_DELAY);
        }
      }
    });

    this.animationFrameId = requestAnimationFrame(this.startLoop);
  };

  /**
   * Registers or updates a MediaStream for activity monitoring.
   */
  public addStream(stream: MediaStream, callback: SubscriberCallback) {
    if (!stream || !this.audioContext) {
      return;
    }

    if (this.tracks.has(stream.id)) {
      this.removeStream(stream.id);
    }

    if (stream.getAudioTracks().length === 0) {
      console.warn(
        `AudioActivityManager: Stream with id '${stream.id}' has no audio tracks.`,
      );
      return;
    }

    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;

    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const processor: TrackProcessor = {
      analyser,
      source,
      dataArray: new Uint8Array(analyser.frequencyBinCount),
      lastKnownSpeakingState: false,
      lastSpokeAt: 0,
      callback,
      throttledUpdateCallback: throttle(
        (audioLevel: number, lastSpokeAt: number) => {
          callback({ isSpeaking: true, audioLevel, lastSpokeAt });
        },
        AUDIO_LEVEL_UPDATE_THROTTLE,
        { edges: ['leading', 'trailing'] },
      ),
    };

    this.tracks.set(stream.id, processor);
  }

  /**
   * Unregisters a MediaStream from activity monitoring and cleans up resources.
   */
  public removeStream(streamId: string) {
    const processor = this.tracks.get(streamId);
    if (!processor) return;

    // Critical: Cancel any pending callbacks and timers to prevent memory leaks.
    processor.throttledUpdateCallback.cancel();
    if (processor.stopTimer) {
      clearTimeout(processor.stopTimer);
    }

    processor.source.disconnect();
    this.tracks.delete(streamId);
  }

  /**
   * Stops the animation loop and cleans up all associated audio resources.
   */
  public destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    this.tracks.forEach((processor) => {
      // Critical: Clean up all pending callbacks and timers.
      processor.throttledUpdateCallback.cancel();
      if (processor.stopTimer) {
        clearTimeout(processor.stopTimer);
      }
      processor.source.disconnect();
    });
    this.tracks.clear();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().then();
    }
  }
}

// Export a single, global instance for the entire application to use.
export const audioActivityManager = new AudioActivityManager();
