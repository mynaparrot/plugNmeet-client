import type { Room } from 'livekit-client';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ConnectionQualityMonitor, { type QualityStats } from '../ConnectionQualityMonitor';

/*
 * Real integration tests for ConnectionQualityMonitor: the actual class runs;
 * only the store, i18n, and the livekit-client constants are mocked (the
 * monitor needs them at import time, and its whole data interface is deferral
 * of the fake Room's PC manager getStats promises).
 */

vi.mock('livekit-client', () => ({
  ConnectionState: {
    Connected: 'connected',
    Connecting: 'connecting',
    Reconnecting: 'reconnecting',
    Disconnected: 'disconnected',
  },
}));

vi.mock('../../../store', () => ({
  store: { dispatch: vi.fn() },
}));

vi.mock('../../../store/slices/roomSettingsSlice', () => ({
  addUserNotification: (input: unknown) => ({ input }),
}));

vi.mock('../../i18n', () => ({
  default: { t: (key: string) => key },
}));

let hidden = false;
const documentListeners = new Map<string, (ev?: unknown) => void>();

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  documentListeners.clear();
  (globalThis as { document: unknown }).document = {
    get hidden() {
      return hidden;
    },
    addEventListener: (type: string, listener: (ev?: unknown) => void) => {
      documentListeners.set(type, listener);
    },
    removeEventListener: (type: string) => {
      documentListeners.delete(type);
    },
  };
});

afterEach(() => {
  vi.useRealTimers();
});

function makeRoom(options: {
  state?: string;
  publisherGetStats?: () => Promise<unknown>;
  subscriberGetStats?: () => Promise<unknown>;
}): Room {
  return {
    state: options.state ?? 'connected',
    engine: {
      pcManager: {
        needsPublisher: true,
        publisher: options.publisherGetStats ? { getStats: options.publisherGetStats } : undefined,
        subscriber: options.subscriberGetStats
          ? { getStats: options.subscriberGetStats }
          : undefined,
      },
    },
    localParticipant: { trackPublications: new Map() },
  } as unknown as Room;
}

function inbound(
  ssrc: string,
  kind: 'video' | 'audio',
  packetsLost: number,
  packetsReceived: number,
) {
  return { type: 'inbound-rtp', ssrc, kind, packetsLost, packetsReceived };
}

const SUBSCRIBER_REPORT = Promise.resolve([inbound('sub', 'video', 0, 0)]);
const PUB_R1 = [inbound('pub', 'video', 0, 0)];
const PUB_STALE_R2 = [inbound('pub', 'video', 10, 90)];
const PUB_R3 = [inbound('pub', 'video', 12, 100)];
const PUB_R5 = [inbound('pub', 'video', 14, 110)];

/*
 * The contamination oracle: on the FIRST sample after a baseline reset the
 * deltas are undefined (there is no previous sample), so remoteReceiveStats
 * MUST be empty. A stale report that had leaked into the reset baseline
 * (10/90 from PUB_STALE_R2) WOULD leave a baseline that produces deltas of
 * 2/10 on that first sample — i.e. receive stats present.
 */

/** Lets the monitor run to completion: microtasks, then the 5s reschedule. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1);
  }
  await vi.advanceTimersByTimeAsync(0);
}

describe('ConnectionQualityMonitor', () => {
  it('registers and removes the visibilitychange listener with start/stop', () => {
    const monitor = new ConnectionQualityMonitor();

    monitor.start(makeRoom({}));
    expect(documentListeners.has('visibilitychange')).toBe(true);

    monitor.stop();
    expect(documentListeners.has('visibilitychange')).toBe(false);
  });

  it('a deferred getStats resolving after resetMeasurementBaseline neither contaminates the fresh baseline nor emits stale evidence', async () => {
    const samples: QualityStats[] = [];
    const resolvers: Array<(report: unknown) => void> = [];
    const publisherGetStats = () =>
      new Promise<unknown>((resolve) => {
        resolvers.push(resolve);
      });

    const monitor = new ConnectionQualityMonitor();
    const room = makeRoom({ publisherGetStats, subscriberGetStats: () => SUBSCRIBER_REPORT });
    monitor.start(room, (stats) => samples.push(stats));

    // sample 1: fresh baseline (0/0) is established
    resolvers[0](PUB_R1);
    await settle();

    expect(samples).toHaveLength(1);
    expect(samples[0]).toBe(monitor.getStats());
    expect(samples[0].measured).toBe(true);
    // no deltas on the very first sample
    expect(samples[0].remoteReceiveStats).toEqual([]);

    // sample 2 is deflected in flight while the baseline is invalidated
    await vi.advanceTimersByTimeAsync(5000);
    await settle(); // registers resolver 1, awaits its report
    expect(resolvers).toHaveLength(2);

    // the lifecycle boundary (reconnect/visibility) crosses the room NOW
    monitor.resetMeasurementBaseline();

    // the stale report arrives AFTER the boundary
    resolvers[1](PUB_STALE_R2);
    await settle();

    // the stale sample was discarded entirely: nothing was emitted, and the
    // diagnostics do not show a measurement from the previous baseline
    expect(samples).toHaveLength(1);
    expect(monitor.getStats()).toBeNull();

    // sample 3: the FIRST real sample on the fresh baseline
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(resolvers).toHaveLength(3);

    resolvers[2](PUB_R3);
    await settle();

    expect(samples).toHaveLength(2);
    const sample3 = samples[1];
    expect(sample3.measured).toBe(true);
    /*
     * Contamination oracle (empty, see above): had the stale report leaked
     * into the reset baseline, this first post-boundary sample would show
     * deltas 2/10 instead of none.
     */
    expect(sample3.remoteReceiveStats).toEqual([]);
    // the processed R3 report now HAS established the fresh baseline 12/100
    expect(monitor.getStats()).toBe(sample3);

    // sample 4: delta against 12/100 proves the fresh chain continues cleanly
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(resolvers).toHaveLength(4);

    resolvers[3](PUB_R5);
    await settle();

    expect(samples).toHaveLength(3);
    const sample4 = samples[2];
    expect(sample4.measured).toBe(true);
    expect(sample4.remoteReceiveStats[0].ssrc).toBe('pub');
    expect(sample4.remoteReceiveStats[0].packetsLostDelta).toBe(2);
    expect(sample4.remoteReceiveStats[0].packetsReceivedDelta).toBe(10);
    expect(sample4.remoteReceiveStats[0].packetLoss).toBeCloseTo((2 / 12) * 100, 5);
  });

  it('resetMeasurementBaseline clears getStats() until a fresh measured sample', async () => {
    const resolvers: Array<(report: unknown) => void> = [];
    let immediateReport: unknown = PUB_R1;
    const publisherGetStats = () =>
      immediateReport !== undefined
        ? Promise.resolve(immediateReport)
        : new Promise<unknown>((resolve) => {
            resolvers.push(resolve);
          });

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({ publisherGetStats, subscriberGetStats: () => SUBSCRIBER_REPORT }),
      () => undefined,
    );

    await settle();
    expect(monitor.getStats()).not.toBeNull();

    // the report the next sample WOULD see has already changed baselines
    immediateReport = PUB_R3; // deltas 12 vs 0 => inbound loss 10.7%

    monitor.resetMeasurementBaseline();
    expect(monitor.getStats()).toBeNull();

    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    const sample = monitor.getStats();
    expect(sample?.measured).toBe(true);
    // fresh baseline: no previous sample => no receive deltas on this sample
    expect(sample?.remoteReceiveStats).toEqual([]);
  });

  it('the visibility boundary itself invalidates measurements (hidden drops the sample, unhide starts fresh)', async () => {
    const samples: QualityStats[] = [];
    let immediateReport: unknown = PUB_R1;

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        publisherGetStats: () => Promise.resolve(immediateReport),
        subscriberGetStats: () => SUBSCRIBER_REPORT,
      }),
      (stats) => samples.push(stats),
    );

    await settle();
    expect(samples).toHaveLength(1);
    expect(monitor.getStats()?.measured).toBe(true);

    // hidden tab: the real wiring runs the visibilitychange handler
    hidden = true;
    documentListeners.get('visibilitychange')?.();

    // while hidden: samples are skipped entirely
    immediateReport = PUB_R3; // would show deltas were stale evidence consumed
    await vi.advanceTimersByTimeAsync(10000);
    await settle();
    expect(samples).toHaveLength(1);
    expect(monitor.getStats()).toBeNull();

    // unhide: the SAME handler fires again (fresh baseline from zero)
    hidden = false;
    documentListeners.get('visibilitychange')?.();

    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples).toHaveLength(2);
    const resumed = samples[1];
    expect(resumed.measured).toBe(true);
    // fresh baseline: no stale deltas (pre-hide baseline is gone)
    expect(resumed.remoteReceiveStats).toEqual([]);

    // the next cycle resumes delta measurement cleanly against the new baseline
    immediateReport = PUB_R5;
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples).toHaveLength(3);
    expect(samples[2].remoteReceiveStats[0].packetsLostDelta).toBe(2);
    expect(samples[2].remoteReceiveStats[0].packetsReceivedDelta).toBe(10);
  });

  it('stop() discards an in-flight measurement: a deferred report resolving after stop is never consumed', async () => {
    const samples: QualityStats[] = [];
    const resolvers: Array<(report: unknown) => void> = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        publisherGetStats: () =>
          new Promise<unknown>((resolve) => {
            resolvers.push(resolve);
          }),
        subscriberGetStats: () => SUBSCRIBER_REPORT,
      }),
      (stats) => samples.push(stats),
    );

    await settle();
    monitor.stop();
    expect(monitor.getStats()).toBeNull();

    // the deferred getStats resolves AFTER stop: must never reschedule or emit
    resolvers[0](PUB_R3);
    await settle();
    await vi.advanceTimersByTimeAsync(30000);

    expect(samples).toHaveLength(0);
    expect(documentListeners.has('visibilitychange')).toBe(false);
  });

  it('synthetic states are emitted with measured:false and never as healthy full-media evidence', async () => {
    const samples: QualityStats[] = [];

    // room never reached the connected state
    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        state: 'reconnecting',
        publisherGetStats: () => Promise.resolve(PUB_R3),
        subscriberGetStats: () => SUBSCRIBER_REPORT,
      }),
      (stats) => samples.push(stats),
    );

    await settle();
    expect(samples).toHaveLength(1);
    const synthetic = samples[0];
    expect(synthetic.measured).toBe(false);
    expect(synthetic.uploadQuality).toBe('lost');
    expect(synthetic.rawPacketLoss).toBe(100);
    // consumers gate: coordinator samples `measured` only when it is not false
    expect(synthetic.measured !== false).toBe(false);
  });

  it('a zero-relevant-entry report counts as synthetic (measured:false), never as evidence', async () => {
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        publisherGetStats: () => Promise.resolve([{ type: 'media-source', kind: 'video' }]),
        subscriberGetStats: () => Promise.resolve([{ type: 'media-source', kind: 'audio' }]),
      }),
      (stats) => samples.push(stats),
    );

    await settle();
    expect(samples).toHaveLength(1);
    expect(samples[0].measured).toBe(false);
    expect(samples[0].remoteReceiveStats).toEqual([]);
  });
});
