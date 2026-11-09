import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_SYNC_ROUNDS,
  SYNC_ROUND_RETRY_MS,
  SYNC_TARGET_TIMEOUT_MS,
  SequentialSyncRequest,
} from '../sequentialSyncRequest';

type Send = { to: string; id: string };

const setup = (targets: string[] | (() => string[])) => {
  const sent: Send[] = [];
  const getTargets = vi.fn(typeof targets === 'function' ? targets : () => targets);
  const sync = new SequentialSyncRequest({
    getTargets,
    send: (to, id) => sent.push({ to, id }),
  });
  return { sync, sent, getTargets };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SequentialSyncRequest', () => {
  it('asks one target at a time, spacing them by the target timeout', () => {
    const { sync, sent } = setup(['a', 'b', 'c']);
    sync.start();

    expect(sent.map((s) => s.to)).toEqual(['a']);
    expect(sync.active).toBe(true);

    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS - 1);
    expect(sent.map((s) => s.to)).toEqual(['a']);

    vi.advanceTimersByTime(1);
    expect(sent.map((s) => s.to)).toEqual(['a', 'b']);

    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
    expect(sent.map((s) => s.to)).toEqual(['a', 'b', 'c']);

    // Every send gets its own id, and all of them stay pending.
    expect(new Set(sent.map((s) => s.id)).size).toBe(3);
    for (const { id } of sent) {
      expect(sync.isPending(id)).toBe(true);
    }
  });

  it('accepts a late answer from an earlier target and stops the run', () => {
    const { sync, sent } = setup(['a', 'b']);
    sync.start();
    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
    expect(sent).toHaveLength(2);

    expect(sync.complete(sent[0].id)).toBe(true);
    expect(sync.active).toBe(false);

    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS * 4);
    expect(sent).toHaveLength(2);
    expect(sync.isPending(sent[0].id)).toBe(false);
  });

  it('ignores an unknown id', () => {
    const { sync, sent } = setup(['a']);
    sync.start();

    expect(sync.isPending('nope')).toBe(false);
    expect(sync.complete('nope')).toBe(false);
    expect(sync.active).toBe(true);

    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
    expect(sent).toHaveLength(1);
  });

  it('retries a fresh round after the round delay and gives up after MAX_SYNC_ROUNDS', () => {
    const { sync, sent, getTargets } = setup(['a']);
    sync.start();
    expect(sent).toHaveLength(1);

    // Each following round re-asks the target after the round delay.
    for (let round = 2; round <= MAX_SYNC_ROUNDS; round++) {
      vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
      vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS);
      expect(sent).toHaveLength(round);
    }
    expect(sent.map((s) => s.to)).toEqual(['a', 'a', 'a']);
    expect(getTargets).toHaveBeenCalledTimes(MAX_SYNC_ROUNDS);
    expect(sync.active).toBe(true);

    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS);
    expect(sync.active).toBe(false);
    expect(sent).toHaveLength(MAX_SYNC_ROUNDS);
    for (const { id } of sent) {
      expect(sync.isPending(id)).toBe(false);
    }
  });

  it('start() is single-flight and keeps earlier ids pending', () => {
    const { sync, sent } = setup(['a', 'b']);
    sync.start();
    sync.start();

    expect(sent).toHaveLength(1);
    expect(sync.complete(sent[0].id)).toBe(true);

    // A new run after completion starts over.
    sync.start();
    expect(sent).toHaveLength(2);
    expect(sync.isPending(sent[0].id)).toBe(false);
    expect(sync.isPending(sent[1].id)).toBe(true);
  });

  it('ends the run when there are no targets', () => {
    const { sync, sent } = setup([]);
    sync.start();

    expect(sent).toHaveLength(0);
    expect(sync.active).toBe(false);

    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS * 4);
    expect(sent).toHaveLength(0);
  });

  it('cancel() clears timers and pending ids', () => {
    const { sync, sent } = setup(['a', 'b']);
    sync.start();
    sync.cancel();

    expect(sync.active).toBe(false);
    expect(sync.isPending(sent[0].id)).toBe(false);

    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS * 4);
    expect(sent).toHaveLength(1);

    // next() outside a run is a no-op.
    sync.next();
    expect(sent).toHaveLength(1);
  });

  it('next() skips to the following target immediately', () => {
    const { sync, sent } = setup(['a', 'b']);
    sync.start();
    sync.next();

    expect(sent.map((s) => s.to)).toEqual(['a', 'b']);
    // The skipped target's id stays pending, so its answer is still accepted.
    expect(sync.isPending(sent[0].id)).toBe(true);

    sync.next();
    // Round exhausted, so the round retry delay applies before the next round.
    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS - 1);
    expect(sent).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(sent.map((s) => s.to)).toEqual(['a', 'b', 'a']);
  });

  it('re-reads targets at every round start', () => {
    let targets = ['a'];
    const { sync, sent } = setup(() => targets);
    sync.start();

    targets = ['b'];
    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS);
    expect(sent.map((s) => s.to)).toEqual(['a', 'b']);
  });
});
