import { useEffect, useState } from 'react';

interface MicrophonePreview {
  level: number;
  active: boolean;
  error: string | null;
}

/**
 * Opens the given mic with getUserMedia and reports a smoothed 0-1 level.
 * Everything is released on device change / unmount.
 *
 * Two deliberate choices that fix the old "dead bar":
 * 1. echoCancellation/noiseSuppression/autoGainControl are DISABLED for the
 *    preview stream — those processors gate silence and made normal speech
 *    read as ~0 on many laptops.
 * 2. The RMS -> 0..1 curve is perceptual (sqrt) not linear, so quiet
 *    speech visibly moves the bar instead of sitting at 5%.
 */
export const useMicrophonePreview = (
  deviceId: string,
  enabled = true,
  resetKey = '',
): MicrophonePreview => {
  const [level, setLevel] = useState(0);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !deviceId) {
      setLevel(0);
      setActive(false);
      setError(null);
      return;
    }
    // resetKey only forces teardown + re-open (retry button); it is
    // intentionally not used otherwise.

    let disposed = false;
    let stream: MediaStream | undefined;
    let ctx: AudioContext | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    let raf = 0;
    let lastEmit = 0;
    const data = new Uint8Array(1024);
    let smoothed = 0;

    const cleanup = () => {
      cancelAnimationFrame(raf);
      try {
        source?.disconnect();
      } catch {}
      try {
        analyser?.disconnect();
      } catch {}
      stream?.getTracks().forEach((t) => t.stop());
      // close async; ignore errors on unmount
      if (ctx && ctx.state !== 'closed') {
        void ctx.close().catch(() => undefined);
      }
      source = undefined;
      analyser = undefined;
      stream = undefined;
      ctx = undefined;
    };

    const tick = (now: number) => {
      if (disposed || !analyser) {
        return;
      }
      analyser.getByteTimeDomainData(
        data as unknown as Uint8Array<ArrayBuffer>,
      );
      let peak = 0;
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128) / 128;
        if (v > peak) {
          peak = v;
        }
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      // Blend RMS (stable) with peak (responsive); sqrt curve lifts quiet
      // speech out of the noise floor so the bar visibly answers.
      const mixed = rms * 0.6 + peak * 0.4;
      const target = Math.min(1, Math.sqrt(Math.max(0, mixed)) * 2.1);
      smoothed += (target - smoothed) * 0.4;

      // emit at ~15fps to avoid re-render storm
      if (now - lastEmit > 66) {
        lastEmit = now;
        if (!disposed) {
          // round to reduce renders on silence
          const rounded = Math.round(smoothed * 100) / 100;
          setLevel((prev) =>
            Math.abs(prev - rounded) > 0.005 ? rounded : prev,
          );
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const start = async () => {
      setError(null);
      setActive(false);
      setLevel(0);
      smoothed = 0;
      try {
        const constraints = (
          deviceConstraint: ExactConstraint | IdealConstraint,
        ): MediaStreamConstraints => ({
          audio: {
            deviceId: deviceConstraint,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        });
        try {
          stream = await navigator.mediaDevices.getUserMedia(
            constraints({ exact: deviceId }),
          );
        } catch {
          // stored id may be stale or browser wants ideal instead of exact
          stream = await navigator.mediaDevices.getUserMedia(
            constraints({ ideal: deviceId }),
          );
        }
        if (disposed) {
          cleanup();
          return;
        }
        if (stream.getAudioTracks().length === 0) {
          throw new Error('no-track');
        }
        ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => undefined);
        }
        if (disposed) {
          cleanup();
          return;
        }
        source = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.15;
        source.connect(analyser);
        setActive(true);
        setError(null);
        raf = requestAnimationFrame(tick);
      } catch (e) {
        console.warn('mic preview failed', e);
        cleanup();
        if (!disposed) {
          setError('preview-failed');
          setActive(false);
        }
      }
    };

    void start();

    return () => {
      disposed = true;
      cleanup();
      setActive(false);
    };
  }, [deviceId, enabled, resetKey]);

  return { level, active, error };
};

type ExactConstraint = { exact: string };
type IdealConstraint = { ideal: string };
