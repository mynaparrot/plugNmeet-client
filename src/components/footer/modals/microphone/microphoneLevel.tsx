import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Microphone } from '../../../../assets/Icons/Microphone';

interface MicrophoneLevelProps {
  level: number;
  active: boolean;
  failed?: boolean;
  hasSelection?: boolean;
  onRetry?: () => void;
}

/**
 * Big, obviously-alive input meter. A segmented 24-block bar + peak-hold
 * marker so even laptop-mic levels are visible across the room, plus a
 * plain-language status line. Simple pass/fail test: bars move = others
 * will hear you. No sound-level grading. Shown once per modal, under the
 * list — never cramped next to the speaker button.
 */
const SEGMENTS = 24;

const MicrophoneLevel = ({
  level,
  active,
  failed,
  hasSelection = true,
  onRetry,
}: MicrophoneLevelProps) => {
  const { t } = useTranslation();
  const [peak, setPeak] = useState(0);
  const peakDecayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pct = Math.round(Math.min(1, Math.max(0, level)) * 100);

  // Peak-hold: jumps with the level, then decays so clipping is visible.
  useEffect(() => {
    setPeak((prev) => Math.max(prev * 0.985, pct));
    if (peakDecayRef.current) {
      clearTimeout(peakDecayRef.current);
    }
    peakDecayRef.current = setTimeout(() => setPeak(0), 2500);
    return () => {
      if (peakDecayRef.current) {
        clearTimeout(peakDecayRef.current);
      }
    };
  }, [pct]);

  const status = useMemo(() => {
    if (failed) {
      return {
        text: t('footer.modal.mic-preview-failed'),
        cls: 'text-Red-500',
        dot: 'bg-Red-500',
        pulse: false,
      };
    }
    if (!hasSelection) {
      return {
        text: t('footer.modal.mic-test-waiting'),
        cls: 'text-Gray-500 dark:text-Gray-400',
        dot: 'bg-Gray-300 dark:bg-Gray-600',
        pulse: false,
      };
    }
    if (!active) {
      return {
        text: t('footer.modal.mic-test-starting'),
        cls: 'text-Gray-500 dark:text-Gray-400',
        dot: 'bg-Gray-300 dark:bg-Gray-600',
        pulse: true,
      };
    }
    if (pct < 4) {
      return {
        text: t('footer.modal.mic-test-speak'),
        cls: 'text-Gray-600 dark:text-Gray-300',
        dot: 'bg-Gray-300 dark:bg-Gray-500',
        pulse: true,
      };
    }
    return {
      text: t('footer.modal.mic-test-good'),
      cls: 'text-Green-600 dark:text-white',
      dot: 'bg-Green-500',
      pulse: false,
    };
  }, [active, failed, hasSelection, pct, t]);

  return (
    <div className="w-full rounded-xl border border-Gray-200 dark:border-Gray-700 bg-Gray-50 dark:bg-dark-secondary2 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-Blue2-50 dark:bg-dark-secondary text-Blue2-600 dark:text-white">
          <Microphone classes="h-4 w-auto" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-Gray-800 dark:text-white">
              {t('footer.modal.mic-test-title')}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span
                className={`h-1.5 w-1.5 rounded-full ${status.dot} ${
                  status.pulse ? 'animate-pulse' : ''
                }`}
              />
              <span aria-live="polite" className={status.cls}>
                {status.text}
              </span>
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('footer.modal.mic-test-title')}
            className="relative mt-1.5 flex h-3 w-full gap-[3px]"
          >
            {Array.from({ length: SEGMENTS }, (_, i) => {
              const threshold = ((i + 1) / SEGMENTS) * 100;
              const on = active && pct >= threshold;
              return (
                <span
                  key={i}
                  className={`h-full flex-1 rounded-[3px] transition-colors duration-75 ${
                    on ? 'bg-Green-500' : 'bg-Gray-200 dark:bg-Gray-700'
                  }`}
                />
              );
            })}
            {active && peak > 4 && (
              <span
                className="pointer-events-none absolute top-[-3px] h-[18px] w-[2px] rounded bg-Gray-800 dark:bg-white"
                style={{ left: `calc(${Math.min(100, peak)}% - 1px)` }}
              />
            )}
          </div>
        </div>
      </div>
      {failed && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 h-8 rounded-lg border border-Gray-300 dark:border-Gray-600 px-3 text-xs font-semibold text-Gray-800 dark:text-white hover:bg-white dark:hover:bg-Gray-700 focus-ring"
        >
          {t('footer.modal.mic-retry')}
        </button>
      )}
    </div>
  );
};

export default MicrophoneLevel;
