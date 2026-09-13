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
 * Calibration (deliberately desensitized so the bar stays calm):
 * 1. echoCancellation/noiseSuppression/autoGainControl are DISABLED for the
 *    preview stream — those processors gate silence and made normal speech
 *    read as ~0 on many laptops.
 * 2. Raw RMS is mapped with a noise floor (0.018) + reference level (0.22)
 *    so normal speech sits ~10-50%, loud speech ~70%, and only shouting
 *    pegs at 100%. Peak is down-weighted and smoothing uses calm attack
 *    (0.35) + slow release (0.15) with a deadband, so room noise and tiny
 *    fluctuations barely move the bar.
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
    let data = new Uint8Array(2048);
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
      // getByteTimeDomainData writes into dataArray with the analyser's
      // fftSize; guard length in case the context was recreated.
      if (data.length !== analyser.fftSize) {
        data = new Uint8Array(analyser.fftSize);
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
      // Map raw level to meter with a noise floor and a reference point:
      // - below NOISE_FLOOR (~room noise) reads 0 so silence looks silent
      // - REF (loud speech rms) reads ~0.8, leaving headroom above it.
      // Deliberately desensitized: higher floor + higher ref + gentler
      // exponent so normal speech sits ~10-50% and small room noises
      // barely move the bar. Peak is down-weighted to avoid spike jumps.
      const NOISE_FLOOR = 0.018;
      const REF = 0.22;
      const clean = Math.max(0, rms - NOISE_FLOOR);
      const fromRms = Math.pow(clean / REF, 0.7) * 0.8;
      const fromPeak = Math.max(0, peak - NOISE_FLOOR * 3) * 0.6;
      const target = Math.min(1, Math.max(fromRms, fromPeak * 0.35));
      // Calm meter: moderate attack (no jumpy spikes), slow release.
      const alpha = target > smoothed ? 0.35 : 0.15;
      smoothed += (target - smoothed) * alpha;

      // emit at ~15fps — calm motion without re-render storm
      if (now - lastEmit > 66) {
        lastEmit = now;
        if (!disposed) {
          // round + deadband to reduce renders on silence/jitter
          const rounded = Math.round(smoothed * 100) / 100;
          setLevel((prev) =>
            prev === 0 && rounded === 0
              ? prev
              : Math.abs(prev - rounded) > 0.008
                ? rounded
                : prev,
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
