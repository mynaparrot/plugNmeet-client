import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Volume } from '../../../../assets/Icons/Volume';

const TEST_DURATION_MS = 3000;

const SpeakerTest = () => {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const nodes = nodesRef.current;
    nodesRef.current = null;
    if (nodes) {
      try {
        nodes.gain.gain.setTargetAtTime(
          0,
          ctxRef.current?.currentTime ?? 0,
          0.05,
        );
        window.setTimeout(() => {
          try {
            nodes.osc.stop();
          } catch {}
          try {
            nodes.osc.disconnect();
          } catch {}
          try {
            nodes.gain.disconnect();
          } catch {}
        }, 200);
      } catch {}
    }
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      const ctx = ctxRef.current;
      ctxRef.current = null;
      window.setTimeout(() => {
        void ctx.close().catch(() => undefined);
      }, 300);
    }
    setPlaying(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const play = useCallback(async () => {
    if (playing) {
      stop();
      return;
    }
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) {
        return;
      }
      const ctx: AudioContext = new Ctx();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => undefined);
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // gentle two-step chime: 660 -> 880
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.35);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
      gain.gain.setValueAtTime(0.25, now + TEST_DURATION_MS / 1000 - 0.3);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + TEST_DURATION_MS / 1000,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      nodesRef.current = { osc, gain };
      setPlaying(true);
      timerRef.current = setTimeout(stop, TEST_DURATION_MS + 400);
    } catch (e) {
      console.warn('speaker test failed', e);
      stop();
    }
  }, [playing, stop]);

  return (
    <div className="w-full border-t border-Gray-200 dark:border-Gray-700 pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-Gray-800 dark:text-white">
            {t('footer.modal.speaker-title')}
          </p>
          <p className="truncate text-xs text-Gray-500 dark:text-Gray-400">
            {t('footer.modal.speaker-des')}
          </p>
        </div>
        <button
          type="button"
          onClick={play}
          aria-pressed={playing}
          className={`flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border px-3 text-xs font-semibold transition-all duration-200 focus-ring ${
            playing
              ? 'border-Red-300 dark:border-Red-600 bg-Red-50 dark:bg-transparent text-Red-600 dark:text-Red-400'
              : 'border-Gray-300 dark:border-Gray-700 bg-white dark:bg-dark-secondary2 text-Gray-800 dark:text-white hover:bg-Gray-50 dark:hover:bg-Gray-700'
          }`}
        >
          <Volume />
          {playing
            ? t('footer.modal.speaker-test-stop')
            : t('footer.modal.speaker-test')}
        </button>
      </div>
    </div>
  );
};

export default SpeakerTest;
