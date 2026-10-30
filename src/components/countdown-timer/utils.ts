import clsx from 'clsx';
import { ITimerBadgeState } from './index';

export const TICK_INTERVAL_MS = 250;
export const URGENT_SECONDS = 10;

export type CountdownTimerStatus = 'idle' | 'running' | 'paused';

export interface IRemainingSecondsParams {
  status: CountdownTimerStatus;
  /** Epoch ms the timer ends at. Zero when the timer is not running. */
  endTime: number;
  /** Frozen remaining seconds reported by the server while paused. */
  pausedRemaining: number;
  nowMs: number;
}

/**
 * Badge styling for the four visual states. Lives outside `timerBadgeContent`
 * so it can be unit tested without pulling in i18n and icons.
 */
export const getTimerBadgeClasses = ({
  isIdle,
  isPaused,
  isUrgent,
  isFinished,
}: ITimerBadgeState) =>
  clsx(
    'h-7 md:h-8 flex items-center gap-1.5 px-2 md:px-2.5 rounded-[10px] border text-xs md:text-sm font-medium transition-colors shadow-sm md:shadow-none',
    isUrgent || isFinished
      ? 'bg-Red-50 dark:bg-Red-700/25 border-Red-400 text-Red-700 dark:text-Red-100'
      : isPaused
        ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 text-amber-800 dark:text-amber-300'
        : isIdle
          ? 'bg-Gray-100 dark:bg-Gray-800 border-Gray-300 dark:border-Gray-700 text-Gray-950 dark:text-white hover:bg-Gray-200/70 dark:hover:bg-Gray-700'
          : 'bg-Blue2-50 dark:bg-Gray-800 border-Gray-200 dark:border-Gray-700 text-Blue2-800 dark:text-white',
    isUrgent && 'animate-pulse',
  );

const pad = (value: number) => value.toString().padStart(2, '0');

/** `mm:ss`, switching to `hh:mm:ss` from one hour on. Never renders negatives. */
export const formatTime = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(safe % 60)}`
    : `${pad(minutes)}:${pad(safe % 60)}`;
};

/**
 * Seconds left for display. Rounds up so the last second is shown for the full
 * second, and never goes below zero.
 */
export const getRemainingSeconds = ({
  status,
  endTime,
  pausedRemaining,
  nowMs,
}: IRemainingSecondsParams) => {
  if (status === 'paused') {
    return pausedRemaining;
  }
  if (status !== 'running' || endTime <= 0) {
    return 0;
  }
  return Math.max(0, Math.ceil((endTime - nowMs) / 1000));
};

export interface ITimerFlags {
  isIdle: boolean;
  isPaused: boolean;
  isFinished: boolean;
  isUrgent: boolean;
}

export const getTimerFlags = (
  status: CountdownTimerStatus,
  remainingSeconds: number,
): ITimerFlags => ({
  isIdle: status === 'idle',
  isPaused: status === 'paused',
  // A paused or idle timer is never "finished"; only a running timer that ran out is.
  isFinished: status === 'running' && remainingSeconds === 0,
  isUrgent: status === 'running' && remainingSeconds > 0 && remainingSeconds <= URGENT_SECONDS,
});

export interface ITimerEndCheckParams {
  status: CountdownTimerStatus;
  endTime: number;
  /** Remaining seconds before this update; -1 before the first measurement. */
  previousSeconds: number;
  currentSeconds: number;
  /** `endTime` already announced as ended, so late ticks cannot notify twice. */
  notifiedEndTime: number;
}

/** True only on the running → zero transition, once per timer end time. */
export const shouldNotifyTimerEnd = ({
  status,
  endTime,
  previousSeconds,
  currentSeconds,
  notifiedEndTime,
}: ITimerEndCheckParams) =>
  status === 'running' &&
  endTime > 0 &&
  // `previousSeconds <= 0` covers both the -1 sentinel (late join) and a repeat tick.
  previousSeconds > 0 &&
  currentSeconds <= 0 &&
  notifiedEndTime !== endTime;

/** Parses a number input, clamping into `[0, max]`; garbage becomes 0. */
export const clampDurationInput = (value: string, max: number) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), max);
};
