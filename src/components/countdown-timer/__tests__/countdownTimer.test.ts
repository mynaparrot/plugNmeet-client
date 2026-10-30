import { describe, expect, it } from 'vitest';

import {
  clampDurationInput,
  formatTime,
  getRemainingSeconds,
  getTimerFlags,
  shouldNotifyTimerEnd,
  TICK_INTERVAL_MS,
  URGENT_SECONDS,
} from '../utils';
import type { IRemainingSecondsParams } from '../utils';
import { getTimerBadgeClasses } from '../utils';

const idleState = { isIdle: false, isPaused: false, isUrgent: false, isFinished: false };

const remaining = (params: Partial<IRemainingSecondsParams> = {}) =>
  getRemainingSeconds({ status: 'running', endTime: 0, pausedRemaining: 0, nowMs: 0, ...params });

describe('formatTime', () => {
  it('renders mm:ss below one hour', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(1)).toBe('00:01');
    expect(formatTime(59)).toBe('00:59');
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(605)).toBe('10:05');
  });

  it('renders the last second of the hour as mm:ss', () => {
    expect(formatTime(3599)).toBe('59:59');
  });

  it('switches to hh:mm:ss at one hour and pads the hour', () => {
    expect(formatTime(3600)).toBe('01:00:00');
    expect(formatTime(3661)).toBe('01:01:01');
    expect(formatTime(36000)).toBe('10:00:00');
    expect(formatTime(359999)).toBe('99:59:59');
  });

  it('keeps growing past 99 hours instead of wrapping', () => {
    expect(formatTime(360000)).toBe('100:00:00');
  });

  it('never renders negative time', () => {
    expect(formatTime(-1)).toBe('00:00');
    expect(formatTime(-7200)).toBe('00:00');
  });

  it('floors fractional seconds so the display never shows a second early', () => {
    expect(formatTime(59.999)).toBe('00:59');
    expect(formatTime(0.4)).toBe('00:00');
  });
});

describe('getRemainingSeconds', () => {
  const now = 1_700_000_000_000;

  it('rounds partial seconds up while running', () => {
    expect(remaining({ endTime: now + 1500, nowMs: now })).toBe(2);
    expect(remaining({ endTime: now + 1000, nowMs: now })).toBe(1);
    expect(remaining({ endTime: now + 1001, nowMs: now })).toBe(2);
  });

  it('stops at zero once the end time has passed', () => {
    expect(remaining({ endTime: now, nowMs: now })).toBe(0);
    expect(remaining({ endTime: now - 60_000, nowMs: now })).toBe(0);
  });

  it('uses the frozen seconds from the server while paused', () => {
    // Deliberately ignores endTime/now: a paused timer does not move.
    expect(
      remaining({ status: 'paused', endTime: now + 900_000, pausedRemaining: 42, nowMs: now }),
    ).toBe(42);
    expect(remaining({ status: 'paused', endTime: 0, pausedRemaining: 7, nowMs: now })).toBe(7);
  });

  it('is zero when idle', () => {
    expect(remaining({ status: 'idle', endTime: now + 900_000, nowMs: now })).toBe(0);
    expect(remaining({ status: 'idle', pausedRemaining: 30, nowMs: now })).toBe(0);
  });

  it('is zero when running without an end time', () => {
    expect(remaining({ endTime: 0, nowMs: now })).toBe(0);
    expect(remaining({ endTime: -5, nowMs: now })).toBe(0);
  });
});

describe('getTimerFlags', () => {
  it('marks idle', () => {
    expect(getTimerFlags('idle', 0)).toEqual({
      isIdle: true,
      isPaused: false,
      isFinished: false,
      isUrgent: false,
    });
  });

  it('marks paused, even at zero or within the urgent window', () => {
    for (const seconds of [0, 5, 600]) {
      expect(getTimerFlags('paused', seconds)).toMatchObject({ isPaused: true, isUrgent: false });
    }
    // A paused timer is never "finished"; only a running one that ran out is.
    expect(getTimerFlags('paused', 0).isFinished).toBe(false);
  });

  it('marks finished only for a running timer at zero', () => {
    expect(getTimerFlags('running', 0).isFinished).toBe(true);
    expect(getTimerFlags('running', 1).isFinished).toBe(false);
    expect(getTimerFlags('idle', 0).isFinished).toBe(false);
  });

  it('marks urgent for the last few seconds only', () => {
    expect(getTimerFlags('running', URGENT_SECONDS).isUrgent).toBe(true);
    expect(getTimerFlags('running', 1).isUrgent).toBe(true);
    expect(getTimerFlags('running', URGENT_SECONDS + 1).isUrgent).toBe(false);
    // Zero is finished, not urgent, so the badge does not pulse forever.
    expect(getTimerFlags('running', 0).isUrgent).toBe(false);
  });

  it('never sets two display states at once', () => {
    const cases = [
      getTimerFlags('idle', 0),
      getTimerFlags('paused', 10),
      getTimerFlags('running', 0),
      getTimerFlags('running', 5),
      getTimerFlags('running', 300),
    ];
    for (const flags of cases) {
      expect(Object.values(flags).filter(Boolean).length).toBeLessThanOrEqual(1);
    }
    // A comfortable running timer simply has no special styling.
    expect(Object.values(getTimerFlags('running', 300)).some(Boolean)).toBe(false);
  });
});

describe('shouldNotifyTimerEnd', () => {
  const base = {
    status: 'running' as const,
    endTime: 1_700_000_000_000,
    previousSeconds: 1,
    currentSeconds: 0,
    notifiedEndTime: 0,
  };

  it('fires on the running transition to zero', () => {
    expect(shouldNotifyTimerEnd(base)).toBe(true);
    // Multiple ticks may land on zero; the notified marker stops duplicates.
    expect(
      shouldNotifyTimerEnd({ ...base, previousSeconds: 0, notifiedEndTime: base.endTime }),
    ).toBe(false);
    expect(shouldNotifyTimerEnd({ ...base, notifiedEndTime: base.endTime })).toBe(false);
  });

  it('does not fire for a late join that never saw the countdown', () => {
    expect(shouldNotifyTimerEnd({ ...base, previousSeconds: -1 })).toBe(false);
  });

  it('does not fire while time remains', () => {
    expect(shouldNotifyTimerEnd({ ...base, currentSeconds: 3 })).toBe(false);
  });

  it('does not fire when paused, idle or without an end time', () => {
    expect(shouldNotifyTimerEnd({ ...base, status: 'paused' })).toBe(false);
    expect(shouldNotifyTimerEnd({ ...base, status: 'idle' })).toBe(false);
    expect(shouldNotifyTimerEnd({ ...base, endTime: 0 })).toBe(false);
  });

  it('notifies again for a new timer (different end time)', () => {
    const nextEnd = base.endTime + 300_000;
    expect(shouldNotifyTimerEnd({ ...base, endTime: nextEnd, notifiedEndTime: base.endTime })).toBe(
      true,
    );
  });
});

describe('clampDurationInput', () => {
  it('keeps in-range numbers', () => {
    expect(clampDurationInput('0', 99)).toBe(0);
    expect(clampDurationInput('7', 99)).toBe(7);
    expect(clampDurationInput('99', 99)).toBe(99);
  });

  it('clamps out-of-range numbers', () => {
    expect(clampDurationInput('120', 99)).toBe(99);
    expect(clampDurationInput('-5', 59)).toBe(0);
  });

  it('treats empty or non-numeric input as zero', () => {
    expect(clampDurationInput('', 59)).toBe(0);
    expect(clampDurationInput('abc', 59)).toBe(0);
  });

  it('truncates decimals like parseInt', () => {
    expect(clampDurationInput('12.9', 99)).toBe(12);
  });
});

describe('getTimerBadgeClasses', () => {
  it('highlights urgent and finished timers in red, pulsing only while urgent', () => {
    const urgent = getTimerBadgeClasses({ ...idleState, isUrgent: true });
    const finished = getTimerBadgeClasses({ ...idleState, isFinished: true });

    expect(urgent).toContain('border-Red-400');
    expect(urgent).toContain('animate-pulse');
    expect(finished).toContain('border-Red-400');
    expect(finished).not.toContain('animate-pulse');
  });

  it('uses amber for paused', () => {
    const paused = getTimerBadgeClasses({ ...idleState, isPaused: true });
    expect(paused).toContain('border-amber-400');
    expect(paused).not.toContain('border-Red-400');
  });

  it('uses the neutral gray for idle and blue for running', () => {
    const idle = getTimerBadgeClasses({ ...idleState, isIdle: true });
    const running = getTimerBadgeClasses(idleState);

    expect(idle).toContain('border-Gray-300');
    expect(running).toContain('border-Gray-200');
    expect(running).not.toContain('border-Gray-300');
  });

  it('always returns the shared badge layout', () => {
    for (const state of Object.values({
      idle: { ...idleState, isIdle: true },
      running: idleState,
      paused: { ...idleState, isPaused: true },
      urgent: { ...idleState, isUrgent: true },
      finished: { ...idleState, isFinished: true },
    })) {
      expect(getTimerBadgeClasses(state)).toContain('rounded-[10px]');
    }
  });
});

describe('timer constants', () => {
  it('tick is fast enough to keep the display on time', () => {
    expect(TICK_INTERVAL_MS).toBeLessThanOrEqual(1000);
    expect(1000 % TICK_INTERVAL_MS).toBe(0);
  });
});
