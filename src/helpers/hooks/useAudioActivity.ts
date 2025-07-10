import { RemoteAudioTrack } from 'livekit-client';
import { useEffect, useRef, useState } from 'react';

// --- Configuration ---
// These thresholds are now based on an accurate RMS calculation.
const SPEAKING_THRESHOLD = 0.04; // Start speaking above this RMS value.
const SILENCE_THRESHOLD = 0.02; // Stop speaking below this RMS value.
const STOP_SPEAKING_DELAY = 500; // 500ms

export interface AudioActivity {
  isSpeaking: boolean;
  audioLevel: number;
  lastSpokeAt: number;
}

/**
 * A React hook that analyzes a RemoteAudioTrack and returns its
 * real-time audio activity, including speaking status and volume level.
 * @param track The RemoteAudioTrack to monitor.
 * @returns An `AudioActivity` object, or `undefined` if no track is provided.
 */
export function useAudioActivity(track?: RemoteAudioTrack) {
  const [audioActivity, setAudioActivity] = useState<AudioActivity | undefined>(
    undefined,
  );

  const stopTimerRef = useRef<number | undefined>(undefined);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!track || !track.mediaStream) {
      setAudioActivity(undefined);
      return;
    }

    // --- Setup Web Audio API ---
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;

    const source = audioContext.createMediaStreamSource(track.mediaStream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let lastKnownSpeakingState = false;

    // --- Analysis Loop ---
    const loop = () => {
      analyser.getByteTimeDomainData(dataArray);

      let sumSquares = 0.0;
      for (const amplitude of dataArray) {
        // Convert 0-255 byte value to -1.0 to 1.0 float. 128 is silence.
        const a = amplitude / 128.0 - 1.0;
        sumSquares += a * a;
      }

      // Calculate Root Mean Square (RMS) for a more accurate volume measure.
      const volume = Math.sqrt(sumSquares / dataArray.length);

      if (volume > SPEAKING_THRESHOLD) {
        // --- User is speaking ---
        if (stopTimerRef.current !== undefined) {
          window.clearTimeout(stopTimerRef.current);
          stopTimerRef.current = undefined; // Reset to undefined
        }
        setAudioActivity({
          isSpeaking: true,
          audioLevel: volume,
          lastSpokeAt: Date.now(),
        });
        lastKnownSpeakingState = true;
      } else if (volume < SILENCE_THRESHOLD) {
        // --- User is silent ---
        if (lastKnownSpeakingState && stopTimerRef.current === undefined) {
          // If they were speaking and there's no stop timer, start one.
          stopTimerRef.current = window.setTimeout(() => {
            lastKnownSpeakingState = false;

            setAudioActivity((prev) => ({
              isSpeaking: false,
              audioLevel: volume,
              // Use the previous timestamp, falling back to 0 if it doesn't exist.
              lastSpokeAt: prev?.lastSpokeAt ?? 0,
            }));

            stopTimerRef.current = undefined; // Reset to undefined after it fires
          }, STOP_SPEAKING_DELAY);
        }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    // --- Cleanup Function ---
    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stopTimerRef.current !== undefined) {
        clearTimeout(stopTimerRef.current);
      }
      source.disconnect();
      if (audioContext.state !== 'closed') {
        audioContext.close().then();
      }
      setAudioActivity(undefined); // Reset state on cleanup
    };
  }, [track]);

  return audioActivity;
}
