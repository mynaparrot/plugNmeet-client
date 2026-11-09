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

const targetsOf = (sent: Send[]) => sent.map((s) => s.to);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SequentialSyncRequest', () => {
  it('asks all targets in order, one at a time', () => {
    const { sync, sent } = setup(['a', 'b', 'c']);
    sync.start();

    expect(targetsOf(sent)).toEqual(['a']);
    expect(sync.active).toBe(true);

    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS - 1);
    expect(targetsOf(sent)).toEqual(['a']);

    vi.advanceTimersByTime(1);
    expect(targetsOf(sent)).toEqual(['a', 'b']);

    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
    expect(targetsOf(sent)).toEqual(['a', 'b', 'c']);

    // Every send gets its own id and stays pending while unanswered.
    expect(new Set(sent.map((s) => s.id)).size).toBe(3);
    for (const { id } of sent) {
      expect(sync.isPending(id)).toBe(true);
    }
  });

  it('an answer advances immediately and the run continues', () => {
    const { sync, sent } = setup(['a', 'b', 'c']);
    sync.start();

    expect(sync.complete(sent[0].id)).toBe(true);
    expect(targetsOf(sent)).toEqual(['a', 'b']);
    expect(sync.active).toBe(true);

    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
    expect(targetsOf(sent)).toEqual(['a', 'b', 'c']);
  });

  it('ends the run once every target has answered', () => {
    const { sync, sent } = setup(['a', 'b']);
    sync.start();

    sync.complete(sent[0].id);
    expect(targetsOf(sent)).toEqual(['a', 'b']);

    sync.complete(sent[1].id);
    expect(sync.active).toBe(false);
    expect(sent).toHaveLength(2);

    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS * 4);
    expect(sent).toHaveLength(2);
  });

  it('retries a timed-out target next round but not the answered ones', () => {
    const { sync, sent } = setup(['a', 'b']);
    sync.start();
    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS); // a silent -> ask b
    expect(targetsOf(sent)).toEqual(['a', 'b']);

    sync.complete(sent[1].id); // b answered, a still unanswered
    expect(sync.active).toBe(true);

    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS);
    expect(targetsOf(sent)).toEqual(['a', 'b', 'a']);

    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS * 2);
    expect(targetsOf(sent).filter((to) => to === 'b')).toHaveLength(1);
  });

  it('accepts a late answer from an earlier target without disturbing the wait', () => {
    const { sync, sent } = setup(['a', 'b']);
    sync.start();
    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
    expect(targetsOf(sent)).toEqual(['a', 'b']);

    expect(sync.complete(sent[0].id)).toBe(true);
    // b is still being waited on: no new request, no end of the run.
    expect(sent).toHaveLength(2);
    expect(sync.isPending(sent[0].id)).toBe(false);
    expect(sync.active).toBe(true);

    // b answers too -> everything is covered, the run is done and a is not re-asked.
    sync.complete(sent[1].id);
    expect(sync.active).toBe(false);
    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS + SYNC_ROUND_RETRY_MS);
    expect(sent).toHaveLength(2);
  });

  it('fail(current) advances at once and leaves the target unanswered', () => {
    const { sync, sent } = setup(['a', 'b']);
    sync.start();
    sync.fail(sent[0].id);

    expect(targetsOf(sent)).toEqual(['a', 'b']);
    // The failed target's id is gone, so a late answer no longer counts.
    expect(sync.isPending(sent[0].id)).toBe(false);

    // a never answered, so it is asked again next round.
    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS + SYNC_ROUND_RETRY_MS);
    expect(targetsOf(sent)).toEqual(['a', 'b', 'a']);
  });

  it('ignores unknown ids', () => {
    const { sync, sent } = setup(['a']);
    sync.start();

    expect(sync.isPending('nope')).toBe(false);
    expect(sync.complete('nope')).toBe(false);
    sync.fail('nope');
    expect(sync.active).toBe(true);
    expect(sent).toHaveLength(1);

    // Outside a run both are no-ops.
    sync.cancel();
    sync.fail(sent[0].id);
    expect(sync.active).toBe(false);
    expect(sent).toHaveLength(1);
  });

  it('gives up after MAX_SYNC_ROUNDS', () => {
    const { sync, sent, getTargets } = setup(['a']);
    sync.start();
    expect(sent).toHaveLength(1);

    for (let round = 2; round <= MAX_SYNC_ROUNDS; round++) {
      vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
      vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS);
      expect(sent).toHaveLength(round);
    }
    expect(targetsOf(sent)).toEqual(['a', 'a', 'a']);
    expect(getTargets).toHaveBeenCalledTimes(MAX_SYNC_ROUNDS);
    expect(sync.active).toBe(true);

    // One round too many: the run is dropped instead of asking again.
    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS);
    expect(sync.active).toBe(false);
    expect(sent).toHaveLength(MAX_SYNC_ROUNDS);
    for (const { id } of sent) {
      expect(sync.isPending(id)).toBe(false);
    }
  });

  it('drops peers that left between rounds', () => {
    let targets = ['a', 'b'];
    const { sync, sent } = setup(() => targets);
    sync.start();
    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS);
    expect(targetsOf(sent)).toEqual(['a', 'b']);

    targets = ['b'];
    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS + SYNC_ROUND_RETRY_MS);
    // A departed peer is not asked again; no new peer joins either.
    expect(targetsOf(sent)).toEqual(['a', 'b', 'b']);

    targets = ['b', 'c'];
    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS + SYNC_ROUND_RETRY_MS);
    expect(targetsOf(sent)).toEqual(['a', 'b', 'b', 'b']);
  });

  it('start(maxTargets) caps the run to the best targets', () => {
    const { sync, sent } = setup(['a', 'b', 'c']);
    sync.start(1);

    expect(targetsOf(sent)).toEqual(['a']);
    // Only the capped target is retried, never 'b'/'c'.
    vi.advanceTimersByTime(SYNC_TARGET_TIMEOUT_MS + SYNC_ROUND_RETRY_MS);
    expect(targetsOf(sent)).toEqual(['a', 'a']);
  });

  it('start() is single-flight', () => {
    const { sync, sent } = setup(['a', 'b']);
    sync.start();
    sync.start();
    expect(sent).toHaveLength(1);

    sync.complete(sent[0].id);
    sync.start(); // active: no-op
    expect(sent).toHaveLength(2);

    sync.cancel();
    sync.start();
    expect(sent).toHaveLength(3);
    expect(sync.isPending(sent[1].id)).toBe(false);
    expect(sync.isPending(sent[2].id)).toBe(true);
  });

  it('ends the run when there are no targets', () => {
    const { sync, sent } = setup([]);
    sync.start();

    expect(sent).toHaveLength(0);
    expect(sync.active).toBe(false);

    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS * 4);
    expect(sent).toHaveLength(0);
  });

  it('cancel() clears timers and known ids', () => {
    const { sync, sent } = setup(['a', 'b']);
    sync.start();
    sync.cancel();

    expect(sync.active).toBe(false);
    expect(sync.isPending(sent[0].id)).toBe(false);

    vi.advanceTimersByTime(SYNC_ROUND_RETRY_MS * 4);
    expect(sent).toHaveLength(1);
  });
});
