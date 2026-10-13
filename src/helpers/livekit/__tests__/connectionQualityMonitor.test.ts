import type { Room } from 'livekit-client';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ConnectionQualityMonitor, {
  PnmConnectionQuality,
  type QualityStats,
} from '../ConnectionQualityMonitor';
import { store } from '../../../store';

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
  Track: {
    Source: {
      Camera: 'camera',
      Microphone: 'microphone',
      ScreenShare: 'screen_share',
      ScreenShareAudio: 'screen_share_audio',
    },
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
  /**
   * PCTransportManager topology mode. Left undefined by default so the plain
   * baseline is neither single-PC publisher-only nor explicitly dual: only the
   * tests that opt in exercise the publisher-only single-PC routing.
   */
  mode?: string;
  needsPublisher?: boolean;
  needsSubscriber?: boolean;
  publisherGetStats?: () => Promise<unknown>;
  subscriberGetStats?: () => Promise<unknown>;
  localTrackPublications?: Map<string, unknown>;
  remoteParticipants?: Map<string, unknown>;
}): Room {
  return {
    state: options.state ?? 'connected',
    engine: {
      pcManager: {
        mode: options.mode,
        needsPublisher: options.needsPublisher ?? true,
        needsSubscriber: options.needsSubscriber,
        publisher: options.publisherGetStats ? { getStats: options.publisherGetStats } : undefined,
        subscriber: options.subscriberGetStats
          ? { getStats: options.subscriberGetStats }
          : undefined,
      },
    },
    localParticipant: {
      trackPublications: options.localTrackPublications ?? new Map(),
    },
    remoteParticipants: options.remoteParticipants ?? new Map(),
  } as unknown as Room;
}

/*
 * A connected publisher that really has an active audio track, so the
 * outbound-stuck detector can mature. `getStats` serves the mutable report.
 */
function makeStuckRoom(getStats: () => Promise<unknown>): Room {
  return makePublisherRoom([MIC_SPEC], getStats);
}

/** One local published media track the fake room exposes to the monitor. */
type LocalMediaSpec = {
  kind: 'audio' | 'video';
  /** Track.Source value; 'microphone'/'camera' are the actionable ones */
  source: string;
  trackId: string;
  mid: string;
  isMuted?: boolean;
  enabled?: boolean;
  readyState?: string;
  label?: string;
};

const MIC_SPEC: LocalMediaSpec = {
  kind: 'audio',
  source: 'microphone',
  trackId: 'mic-1',
  mid: 'm',
};

const CAMERA_SPEC: LocalMediaSpec = {
  kind: 'video',
  source: 'camera',
  trackId: 'cam-1',
  mid: 'v',
};

/**
 * A connected publisher publishing the given local tracks. `specs` may be a
 * getter so a test can swap the published track (identity change) mid-run.
 * `needsSubscriber` is left undefined: the subscriber direction is neither
 * required nor carrying media, so only publisher evidence decides `measured`.
 */
function makePublisherRoom(
  specs: LocalMediaSpec[] | (() => LocalMediaSpec[]),
  getStats: () => Promise<unknown>,
): Room {
  const resolveSpecs = () => (typeof specs === 'function' ? specs() : specs);
  // track/publication objects are cached per track id so the sender, the
  // transceiver and the publication always hand out the SAME MediaStreamTrack:
  // the monitor resolves the publication through that identity
  const tracks = new Map<string, MediaStreamTrack>();
  const publications = new Map<string, unknown>();

  const trackFor = (spec: LocalMediaSpec): MediaStreamTrack => {
    const existing = tracks.get(spec.trackId);

    if (existing) return existing;

    const track = {
      id: spec.trackId,
      enabled: spec.enabled ?? true,
      readyState: spec.readyState ?? 'live',
      label: spec.label ?? (spec.kind === 'audio' ? 'mic' : 'camera'),
    } as unknown as MediaStreamTrack;

    tracks.set(spec.trackId, track);

    return track;
  };

  const publicationFor = (spec: LocalMediaSpec) => {
    const existing = publications.get(spec.trackId);

    if (existing) return existing;

    const publication = {
      kind: spec.kind,
      source: spec.source,
      trackSid: `TR_${spec.trackId}`,
      isMuted: spec.isMuted ?? false,
      track: { mediaStreamTrack: trackFor(spec) },
    };

    publications.set(spec.trackId, publication);

    return publication;
  };

  return {
    state: 'connected',
    engine: {
      pcManager: {
        needsPublisher: true,
        publisher: {
          getStats,
          getTransceivers: () =>
            resolveSpecs().map((spec) => ({
              mid: spec.mid,
              direction: 'sendonly',
              sender: { track: trackFor(spec) },
            })),
        },
      },
    },
    localParticipant: {
      get trackPublications() {
        const current = new Map<string, unknown>();

        resolveSpecs().forEach((spec, index) => current.set(`p${index}`, publicationFor(spec)));

        return current;
      },
    },
    remoteParticipants: new Map(),
  } as unknown as Room;
}

/**
 * A connected session with BOTH PeerConnections: the publisher publishes the
 * given local tracks (its report served by `publisherReport`) and the subscriber
 * receives real media from a live subscribed remote track (its report served by
 * `subscriberReport`). `needsSubscriber` is true, so the receive direction is
 * genuinely expected and both reports are processed every interval.
 */
function makeDualRoom(options: {
  specs: LocalMediaSpec[];
  publisherReport: () => Promise<unknown>;
  subscriberReport: () => Promise<unknown>;
}): Room {
  const room = makePublisherRoom(options.specs, options.publisherReport) as unknown as {
    engine: { pcManager: Record<string, unknown> };
    remoteParticipants: Map<string, unknown>;
  };

  room.engine.pcManager.needsSubscriber = true;
  room.engine.pcManager.subscriber = { getStats: options.subscriberReport };
  room.remoteParticipants = subscribedRemoteParticipants();

  return room as unknown as Room;
}

/**
 * A spec RTCAudioSourceStats (media-source) entry. `totalAudioEnergy` is the
 * accumulated, duration-weighted energy of the captured samples (per spec each
 * sample's squared amplitude times its duration) and `totalSamplesDuration` is
 * the cumulative produced duration in seconds. Because the energy is already
 * duration-weighted, an interval's captured RMS amplitude is
 * sqrt(deltaEnergy / deltaDuration) — the sample rate cancels out.
 */
function audioSource(
  trackIdentifier: string,
  totalAudioEnergy: number,
  options: { id?: string; totalSamplesDuration?: number } = {},
) {
  return {
    type: 'media-source',
    kind: 'audio',
    id: options.id ?? `src-${trackIdentifier}`,
    trackIdentifier,
    totalAudioEnergy,
    totalSamplesDuration: options.totalSamplesDuration ?? 30,
  };
}

/*
 * Realistic per-interval capture energies (the monitor samples every 5s). RMS =
 * sqrt(deltaEnergy / deltaDuration), so MEANINGFUL delivers sqrt(0.05 / 5) = 0.1
 * (a comfortable conversational voice well above the 0.01 floor) while
 * NOISE_FLOOR creeps sqrt(0.0002 / 5) ≈ 0.0063 (a live mic's background hiss,
 * below the floor). A flat energy/duration models user silence / Opus DTX.
 */
const MEANINGFUL_ENERGY_PER_INTERVAL = 0.05; // 5s interval -> RMS ~0.1
const NOISE_FLOOR_ENERGY_PER_INTERVAL = 0.0002; // 5s interval -> RMS ~0.0063

function candidatePair(
  id: string,
  rttSeconds: number,
  flags: { selected?: boolean; nominated?: boolean } = {},
) {
  return {
    type: 'candidate-pair',
    id,
    state: 'succeeded',
    currentRoundTripTime: rttSeconds,
    ...flags,
  };
}

function transport(selectedCandidatePairId: string) {
  return { type: 'transport', id: 'transport', selectedCandidatePairId };
}

/**
 * A remote-inbound-rtp entry. `timestamp` is the RTCStats arrival time, which
 * the spec defines as the time the corresponding RTCP RR was received — the
 * only standard freshness marker for this stats type.
 */
function remoteInbound(fields: {
  ssrc: string;
  fractionLost?: number;
  roundTripTime?: number;
  timestamp?: number;
}) {
  return { type: 'remote-inbound-rtp', kind: 'audio', ...fields };
}

/** A remote participant holding one live subscribed track (receive media). */
function subscribedRemoteParticipants(): Map<string, unknown> {
  const mediaStreamTrack = { readyState: 'live' } as unknown as MediaStreamTrack;
  const publication = {
    kind: 'audio',
    isSubscribed: true,
    track: { mediaStreamTrack },
  };

  return new Map([['remote', { trackPublications: new Map([['r1', publication]]) }]]);
}

/** Local publications of one live, unmuted track (real publish media). */
function activeLocalPublications(): Map<string, unknown> {
  const mediaStreamTrack = {
    enabled: true,
    readyState: 'live',
    label: 'mic',
  } as unknown as MediaStreamTrack;
  const publication = {
    kind: 'audio',
    isMuted: false,
    track: { mediaStreamTrack },
  };

  return new Map([['l1', publication]]);
}

function outbound(
  ssrc: string,
  kind: 'audio' | 'video',
  bytesSent: number,
  framesSent = 0,
  mid?: string,
  extra: { active?: boolean; mediaSourceId?: string } = {},
) {
  return { type: 'outbound-rtp', ssrc, kind, bytesSent, framesSent, mid, ...extra };
}

/** A publisher report carrying a genuinely selected candidate pair (RTT). */
const PUB_PAIR = [transport('pub-pair'), candidatePair('pub-pair', 0.02, { selected: true })];

function inbound(
  ssrc: string,
  kind: 'video' | 'audio',
  packetsLost: number,
  packetsReceived: number,
) {
  return { type: 'inbound-rtp', ssrc, kind, packetsLost, packetsReceived };
}

const SUBSCRIBER_REPORT = Promise.resolve([inbound('sub', 'video', 0, 0)]);

/**
 * A subscriber report with its OWN selected candidate pair (receive RTT) and a
 * real inbound media delta, so the download direction produces genuine, usable
 * evidence independent of the publisher report.
 */
function healthySubscriberReport(packetsReceived: number) {
  return [
    transport('sub-pair'),
    candidatePair('sub-pair', 0.03, { selected: true }),
    inbound('sub', 'audio', 0, packetsReceived),
  ];
}
/*
 * A connected publisher always exposes a selected candidate pair, which is the
 * baseline's genuine usable upload evidence; the inbound deltas are only
 * receive-side confirmation.
 */
const PUB_R1 = [...PUB_PAIR, inbound('pub', 'video', 0, 0)];
const PUB_STALE_R2 = [...PUB_PAIR, inbound('pub', 'video', 10, 90)];
const PUB_R3 = [...PUB_PAIR, inbound('pub', 'video', 12, 100)];
const PUB_R5 = [...PUB_PAIR, inbound('pub', 'video', 14, 110)];

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

describe('ConnectionQualityMonitor measurement integrity', () => {
  it('synthetic (unmeasured) samples never move score, history or notifications', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    // room is never connected => every sample is synthetic
    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        state: 'reconnecting',
        publisherGetStats: () => Promise.resolve(PUB_R3),
        subscriberGetStats: () => SUBSCRIBER_REPORT,
      }),
      (stats) => samples.push(stats),
    );

    for (let i = 0; i < 6; i++) {
      await settle();
      expect(samples).toHaveLength(i + 1);
      expect(samples[i].measured).toBe(false);
      // the smoothed score stays pinned at its untouched maximum
      expect(samples[i].score).toBe(100);
      await vi.advanceTimersByTimeAsync(5000);
    }

    // repeatedly "losing" upload would trip the notification if the synthetic
    // samples had been recorded into history
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(monitor.getOverallQuality()).toBe('excellent');
  });

  it('a measured poor sample moves the score once; later synthetic samples leave it untouched', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];
    const room = makeRoom({
      publisherGetStats: () =>
        Promise.resolve([
          remoteInbound({
            ssrc: 'a',
            fractionLost: 0.5,
            roundTripTime: 0.5,
            timestamp: 1000,
          }),
        ]),
    });

    const monitor = new ConnectionQualityMonitor();
    monitor.start(room, (stats) => samples.push(stats));

    await settle();
    expect(samples[0].measured).toBe(true);
    expect(samples[0].myPacketLoss).toBeCloseTo(50, 5);
    expect(samples[0].uploadQuality).toBe('lost');
    const measuredScore = samples[0].score;
    expect(measuredScore).toBeLessThan(100);

    // the room leaves the connected state: every following sample is synthetic
    (room as unknown as { state: string }).state = 'reconnecting';

    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples[1].measured).toBe(false);
    expect(samples[1].score).toBe(measuredScore);

    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples[2].score).toBe(measuredScore);
    // overall quality is the last genuinely measured value, not degraded
    expect(monitor.getOverallQuality()).toBe('poor');
  });

  it('uses the transport selected candidate pair and ignores a stale nominated pair', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];
    const report = [
      transport('pair-good'),
      candidatePair('pair-stale', 0.9, { nominated: true }),
      candidatePair('pair-good', 0.05, { selected: true }),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(makeRoom({ publisherGetStats: () => Promise.resolve(report) }), (s) =>
      samples.push(s),
    );

    await settle();
    expect(samples).toHaveLength(1);
    expect(samples[0].measured).toBe(true);
    expect(samples[0].uploadRtt).toBe(50);
    // the stale 900ms nominated pair would have classified Poor
    expect(samples[0].uploadQuality).toBe('excellent');
  });

  it('falls back to the nominated pair only when the transport exposes no selection', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];
    const report = [candidatePair('pair-nominated', 0.9, { nominated: true })];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(makeRoom({ publisherGetStats: () => Promise.resolve(report) }), (s) =>
      samples.push(s),
    );

    await settle();
    expect(samples[0].uploadRtt).toBe(900);
    expect(samples[0].uploadQuality).toBe('poor');
  });

  it('keeps upload and receive RTT separate: receive never inherits a publisher-only high RTT', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];
    const publisherReport = [
      transport('pub-pair'),
      candidatePair('pub-pair', 0.9, { selected: true }),
    ];
    const subscriberReport = [
      transport('sub-pair'),
      candidatePair('sub-pair', 0.02, { selected: true }),
      inbound('sub', 'audio', 0, 100),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        publisherGetStats: () => Promise.resolve(publisherReport),
        subscriberGetStats: () => Promise.resolve(subscriberReport),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].uploadRtt).toBe(900);
    expect(samples[0].receiveRtt).toBe(20);
    expect(samples[0].uploadQuality).toBe('poor');
    expect(samples[0].receiveQuality).toBe('excellent');
    expect(samples[0].isReceivingPoor).toBe(false);
    // back-compat diagnostics: rtt is the max across directions, myRtt the upload
    expect(samples[0].rtt).toBe(900);
    expect(samples[0].myRtt).toBe(900);
  });

  it('receive quality reflects a subscriber-only high RTT independently of a healthy upload', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];
    const publisherReport = [
      transport('pub-pair'),
      candidatePair('pub-pair', 0.02, { selected: true }),
    ];
    const subscriberReport = [
      transport('sub-pair'),
      candidatePair('sub-pair', 0.9, { selected: true }),
      inbound('sub', 'video', 0, 100),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        publisherGetStats: () => Promise.resolve(publisherReport),
        subscriberGetStats: () => Promise.resolve(subscriberReport),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].uploadRtt).toBe(20);
    expect(samples[0].receiveRtt).toBe(900);
    expect(samples[0].uploadQuality).toBe('excellent');
    expect(samples[0].receiveQuality).toBe('poor');
    expect(samples[0].isReceivingPoor).toBe(true);
  });

  it('treats a failed expected direction as unknown (measured:false), never as healthy recovery', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        needsPublisher: true,
        needsSubscriber: true,
        publisherGetStats: () => Promise.resolve([...PUB_PAIR, inbound('pub', 'video', 0, 100)]),
        subscriberGetStats: () => Promise.reject(new Error('subscriber stats failed')),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples).toHaveLength(1);
    expect(samples[0].measured).toBe(false);
  });

  it('keeps a legitimate publisher-only session measured (no subscriber needed)', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        needsPublisher: true,
        needsSubscriber: false,
        publisherGetStats: () => Promise.resolve([...PUB_PAIR, inbound('pub', 'video', 0, 100)]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(true);
  });

  it('keeps a legitimate subscriber-only session measured (no publisher needed)', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        needsPublisher: false,
        needsSubscriber: true,
        subscriberGetStats: () =>
          Promise.resolve([
            transport('sub-pair'),
            candidatePair('sub-pair', 0.02, { selected: true }),
            inbound('sub', 'video', 0, 100),
          ]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(true);
  });

  it('active subscriber media keeps the download direction required when needsSubscriber is false (failed report)', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        // default-dual: needsPublisher defaults true, needsSubscriber is unset
        remoteParticipants: subscribedRemoteParticipants(),
        publisherGetStats: () => Promise.resolve([...PUB_PAIR, inbound('pub', 'video', 0, 100)]),
        subscriberGetStats: () => Promise.reject(new Error('subscriber stats failed')),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples).toHaveLength(1);
    // a healthy publisher must NEVER manufacture healthy receive recovery
    expect(samples[0].measured).toBe(false);
  });

  it('active subscriber media keeps the download direction required when needsSubscriber is false (empty report)', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        remoteParticipants: subscribedRemoteParticipants(),
        publisherGetStats: () => Promise.resolve([...PUB_PAIR, inbound('pub', 'video', 0, 100)]),
        // resolves, but proves nothing about the receive direction
        subscriberGetStats: () => Promise.resolve([]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(false);
  });

  it('a publisher-only session with no subscriber media stays measured', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        needsPublisher: true,
        needsSubscriber: false,
        publisherGetStats: () => Promise.resolve([...PUB_PAIR, inbound('pub', 'video', 0, 100)]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(true);
  });

  it('a subscriber-primary session that later publishes requires publisher evidence', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        needsPublisher: false,
        needsSubscriber: true,
        // an active local track proves real publish media despite needsPublisher:false
        localTrackPublications: activeLocalPublications(),
        publisherGetStats: () => Promise.reject(new Error('publisher stats failed')),
        subscriberGetStats: () =>
          Promise.resolve([
            transport('sub-pair'),
            candidatePair('sub-pair', 0.02, { selected: true }),
            inbound('sub', 'video', 0, 100),
          ]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(false);
  });

  it('counts a newly arrived receiver report once and never re-counts a stale one', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];
    let report = [
      remoteInbound({
        ssrc: 'a',
        fractionLost: 0.5,
        roundTripTime: 0.5,
        timestamp: 1000,
      }),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(makeRoom({ publisherGetStats: () => Promise.resolve(report) }), (s) =>
      samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(true);
    expect(samples[0].myPacketLoss).toBeCloseTo(50, 5);
    expect(samples[0].uploadRtt).toBe(500);
    const measuredScore = samples[0].score;

    // the SAME receiver report (arrival timestamp unchanged) proves nothing:
    // unknown, never a manufactured recovery, and it must not move the score
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples[1].measured).toBe(false);
    expect(samples[1].myPacketLoss).toBe(0);
    expect(samples[1].uploadRtt).toBeNull();
    expect(samples[1].score).toBe(measuredScore);

    // a genuinely NEW receiver report is counted again
    report = [
      remoteInbound({
        ssrc: 'a',
        fractionLost: 0.5,
        roundTripTime: 0.5,
        timestamp: 2000,
      }),
    ];
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples[2].measured).toBe(true);
    expect(samples[2].myPacketLoss).toBeCloseTo(50, 5);
    expect(samples[2].uploadRtt).toBe(500);
  });

  it('bare outbound counters alone never make a sample measured and preserve the score', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];
    let report: unknown = [
      remoteInbound({
        ssrc: 'a',
        fractionLost: 0.5,
        roundTripTime: 0.5,
        timestamp: 1000,
      }),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(makeRoom({ publisherGetStats: () => Promise.resolve(report) }), (s) =>
      samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(true);
    const score = samples[0].score;
    expect(score).toBeLessThan(100);

    // outbound byte/frame counters alone prove nothing about link health
    report = [outbound('o', 'audio', 1000), outbound('v', 'video', 5000, 10)];
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples[1].measured).toBe(false);
    expect(samples[1].score).toBe(score);
    expect(samples[1].remoteReceiveStats).toEqual([]);
    expect(monitor.getOverallQuality()).toBe('poor');
  });

  it('unselected candidate pairs alone never make a sample measured', async () => {
    // no transport metadata: an unselected pair must not supply RTT...
    const samples: QualityStats[] = [];
    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({ publisherGetStats: () => Promise.resolve([candidatePair('idle', 0.9)]) }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(false);
    expect(samples[0].uploadRtt).toBeNull();
    monitor.stop();

    // ...and with transport metadata it is explicitly not the selected pair
    const samples2: QualityStats[] = [];
    const monitor2 = new ConnectionQualityMonitor();
    monitor2.start(
      makeRoom({
        publisherGetStats: () => Promise.resolve([transport('real'), candidatePair('idle', 0.9)]),
      }),
      (s) => samples2.push(s),
    );

    await settle();
    expect(samples2[0].measured).toBe(false);
    expect(samples2[0].uploadRtt).toBeNull();
  });

  it('treats a zero subscriber selected-pair RTT as a real measurement, not a missing one', async () => {
    // A finite numeric zero is accepted by policy as a real reading, distinct
    // from an absent RTT (null) that proves nothing. It is genuine directional
    // evidence and must keep the direction usable so quality still flows on.
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];
    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        needsPublisher: true,
        needsSubscriber: true,
        publisherGetStats: () =>
          Promise.resolve([
            transport('pub-pair'),
            candidatePair('pub-pair', 0.02, { selected: true }),
          ]),
        subscriberGetStats: () =>
          Promise.resolve([
            transport('sub-pair'),
            candidatePair('sub-pair', 0, { selected: true }),
          ]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].receiveMeasured).toBe(true);
    expect(samples[0].receiveRtt).toBe(0);
    expect(samples[0].receiveQuality).toBe('excellent');
    expect(samples[0].measured).toBe(true);
  });

  it('treats a zero publisher RTT as a real upload measurement (selected pair and receiver report)', async () => {
    vi.mocked(store.dispatch).mockClear();

    // a zero selected candidate pair
    const samples: QualityStats[] = [];
    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        needsPublisher: true,
        needsSubscriber: false,
        publisherGetStats: () =>
          Promise.resolve([
            transport('pub-pair'),
            candidatePair('pub-pair', 0, { selected: true }),
          ]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].uploadMeasured).toBe(true);
    expect(samples[0].uploadRtt).toBe(0);
    expect(samples[0].myRtt).toBe(0);
    expect(samples[0].uploadQuality).toBe('excellent');
    expect(samples[0].measured).toBe(true);
    monitor.stop();

    // ...and a fresh receiver report carrying a zero round trip
    const samples2: QualityStats[] = [];
    const monitor2 = new ConnectionQualityMonitor();
    monitor2.start(
      makeRoom({
        needsPublisher: true,
        needsSubscriber: false,
        publisherGetStats: () =>
          Promise.resolve([
            remoteInbound({ ssrc: 'a', fractionLost: 0, roundTripTime: 0, timestamp: 1000 }),
          ]),
      }),
      (s) => samples2.push(s),
    );

    await settle();
    expect(samples2[0].uploadMeasured).toBe(true);
    expect(samples2[0].uploadRtt).toBe(0);
    expect(samples2[0].measured).toBe(true);
  });

  it('still rejects impossible selected-pair RTT readings (negative, NaN, infinite, above the ceiling)', async () => {
    const impossible: number[] = [
      -1,
      -0.001,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      11, // 11000ms, above the 10s (10000ms) RTT sanity ceiling
    ];

    for (const rttSeconds of impossible) {
      const samples: QualityStats[] = [];
      const monitor = new ConnectionQualityMonitor();
      monitor.start(
        makeRoom({
          needsPublisher: true,
          needsSubscriber: false,
          publisherGetStats: () =>
            Promise.resolve([
              transport('pub-pair'),
              candidatePair('pub-pair', rttSeconds, { selected: true }),
            ]),
        }),
        (s) => samples.push(s),
      );

      await settle();
      expect(samples[0].uploadMeasured).toBe(false);
      expect(samples[0].uploadRtt).toBeNull();
      expect(samples[0].measured).toBe(false);
      monitor.stop();
    }
  });

  it('a fresh zero-loss receiver report is measured and can recover the score', async () => {
    const samples: QualityStats[] = [];
    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        publisherGetStats: () =>
          Promise.resolve([
            remoteInbound({
              ssrc: 'a',
              fractionLost: 0,
              roundTripTime: 0.02,
              timestamp: 1000,
            }),
          ]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(true);
    expect(samples[0].myPacketLoss).toBe(0);
    expect(samples[0].uploadRtt).toBe(20);
    expect(samples[0].uploadQuality).toBe('excellent');
  });

  it('a receiver report without any freshness field is unknown, never healthy', async () => {
    const samples: QualityStats[] = [];
    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        publisherGetStats: () =>
          Promise.resolve([remoteInbound({ ssrc: 'a', fractionLost: 0.5, roundTripTime: 0.5 })]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(false);
    expect(samples[0].myPacketLoss).toBe(0);
    expect(samples[0].uploadRtt).toBeNull();
  });

  it('a first-ever receiver report with a zero arrival timestamp is not fresh', async () => {
    const samples: QualityStats[] = [];
    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        publisherGetStats: () =>
          Promise.resolve([
            remoteInbound({
              ssrc: 'a',
              fractionLost: 0.5,
              roundTripTime: 0.5,
              timestamp: 0,
            }),
          ]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(false);
    expect(samples[0].myPacketLoss).toBe(0);
    expect(samples[0].uploadRtt).toBeNull();
  });

  it('uses the receiver-report arrival timestamp as the freshness proof', async () => {
    const samples: QualityStats[] = [];
    let report: unknown = [remoteInbound({ ssrc: 'a', fractionLost: 0.5, timestamp: 1000 })];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(makeRoom({ publisherGetStats: () => Promise.resolve(report) }), (s) =>
      samples.push(s),
    );

    // a first-ever arrival timestamp is a genuinely fresh report
    await settle();
    expect(samples[0].measured).toBe(true);
    expect(samples[0].myPacketLoss).toBeCloseTo(50, 5);

    // an unchanged arrival timestamp means no new RR: stale
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples[1].measured).toBe(false);
    expect(samples[1].myPacketLoss).toBe(0);

    // a newer arrival timestamp is a genuinely new report
    report = [remoteInbound({ ssrc: 'a', fractionLost: 0.5, timestamp: 2000 })];
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples[2].measured).toBe(true);
    expect(samples[2].myPacketLoss).toBeCloseTo(50, 5);
  });

  it('a non-advancing receiver-report arrival timestamp is never treated as fresh', async () => {
    const samples: QualityStats[] = [];
    const rr = (timestamp: number) =>
      remoteInbound({
        ssrc: 'a',
        fractionLost: 0.5,
        roundTripTime: 0.5,
        timestamp,
      });
    let report: unknown = [rr(5000)];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(makeRoom({ publisherGetStats: () => Promise.resolve(report) }), (s) =>
      samples.push(s),
    );

    await settle();
    expect(samples[0].measured).toBe(true);

    // the same arrival timestamp (no new RR): unknown, never fresh
    report = [rr(5000)];
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples[1].measured).toBe(false);
    expect(samples[1].myPacketLoss).toBe(0);

    // a regressed timestamp must not be fresh either
    report = [rr(3000)];
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples[2].measured).toBe(false);

    // a genuinely newer arrival timestamp is fresh again
    report = [rr(6000)];
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples[3].measured).toBe(true);
    expect(samples[3].myPacketLoss).toBeCloseTo(50, 5);
  });

  it('a non-connected interval drops the stuck baseline so a phantom stall cannot mature', async () => {
    const samples: QualityStats[] = [];
    // the bytes never advance while a meaningful captured signal proves the mic
    // keeps producing audio: the send stall is verified, not mere user silence
    let energy = 0;
    let duration = 30;
    let report: unknown = [
      outbound('o', 'audio', 1000, 0, 'm'),
      audioSource('mic-1', energy, { totalSamplesDuration: duration }),
    ];
    const room = makeStuckRoom(() => Promise.resolve(report));

    const monitor = new ConnectionQualityMonitor();
    monitor.start(room, (s) => samples.push(s));

    /** Another interval with the same send counter and fresh capture energy. */
    const nextInterval = async () => {
      energy += MEANINGFUL_ENERGY_PER_INTERVAL;
      duration += 5;
      report = [
        outbound('o', 'audio', 1000, 0, 'm'),
        audioSource('mic-1', energy, { totalSamplesDuration: duration }),
      ];
      await vi.advanceTimersByTimeAsync(5000);
      await settle();
    };

    // sample 1: the initial baseline (no prior observation -> no stall)
    await settle();
    expect(samples[0].isUploadAudioStuck).toBe(false);

    // the room leaves the connected state: the interval is unknown
    (room as unknown as { state: string }).state = 'reconnecting';
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samples[1].measured).toBe(false);

    (room as unknown as { state: string }).state = 'connected';
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    // fresh post-gap baseline: the unchanged counter is not a stall yet
    expect(samples[2].isUploadAudioStuck).toBe(false);

    await nextInterval();
    // without dropping the pre-gap baseline this sample would already be a
    // matured two-observation stall
    expect(samples[3].isUploadAudioStuck).toBe(false);

    await nextInterval();
    // two contiguous post-gap stagnant observations do mature, so genuine
    // stuck protection is preserved
    expect(samples[4].isUploadAudioStuck).toBe(true);
    expect(samples[4].measured).toBe(true);
  });

  it('a stop/start cycle leaves no stale loop: the old in-flight collection neither reschedules nor releases the new lock', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samplesOld: QualityStats[] = [];
    const oldResolvers: Array<(report: unknown) => void> = [];
    const samplesNew: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();

    // OLD loop on the old room, blocked on a deferred publisher report
    monitor.start(
      makeRoom({
        publisherGetStats: () =>
          new Promise<unknown>((resolve) => {
            oldResolvers.push(resolve);
          }),
        subscriberGetStats: () => SUBSCRIBER_REPORT,
      }),
      (s) => samplesOld.push(s),
    );
    await settle();
    expect(oldResolvers).toHaveLength(1); // the old loop is awaiting its report
    expect(vi.getTimerCount()).toBe(0); // an in-flight loop owns no timer

    // stop and immediately start a fresh loop on a new room
    monitor.start(
      makeRoom({
        publisherGetStats: () => Promise.resolve(PUB_R1),
        subscriberGetStats: () => SUBSCRIBER_REPORT,
      }),
      (s) => samplesNew.push(s),
    );
    await settle();
    expect(samplesNew).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1); // only the new loop's own reschedule

    /*
     * The OLD in-flight report resolves after the new loop is established.
     * The superseded loop must be completely inert: it may neither emit nor
     * arm a rogue reschedule of its own. The armed-timer count is the
     * discriminator: a stale finally that reached the reschedule would leave
     * a spurious pending timer even though its own top-of-loop token guard
     * blocks the phantom sample.
     */
    oldResolvers[0](PUB_R3);
    await settle();
    expect(samplesOld).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(1); // still only the new loop's timer

    // the new loop owns the cadence: one fresh sample per interval, never doubled
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(5000);
      await settle();
    }
    expect(samplesNew).toHaveLength(5);
    expect(samplesOld).toHaveLength(0);
  });

  it("a superseded in-flight collection cannot erase the new loop's inbound or outbound baselines", async () => {
    vi.mocked(store.dispatch).mockClear();
    const samplesOld: QualityStats[] = [];
    const samplesNew: QualityStats[] = [];
    const oldResolvers: Array<(report: unknown) => void> = [];

    // the new loop's room has real publish media, so the outbound-stuck
    // detector can arm alongside the inbound delta detector
    const track = {
      id: 'mic-1',
      enabled: true,
      readyState: 'live',
      label: 'mic',
    } as unknown as MediaStreamTrack;
    const publication = {
      kind: 'audio',
      source: 'microphone',
      trackSid: 'TR_mic-1',
      isMuted: false,
      track: { mediaStreamTrack: track },
    };
    let report: unknown = [
      transport('pub-pair'),
      candidatePair('pub-pair', 0.02, { selected: true }),
      inbound('pub', 'video', 0, 0),
      outbound('o', 'audio', 1000, 0, 'm'),
      audioSource('mic-1', 0, { totalSamplesDuration: 30 }),
    ];
    const newRoom = {
      state: 'connected',
      engine: {
        pcManager: {
          needsPublisher: true,
          publisher: {
            getStats: () => Promise.resolve(report),
            getTransceivers: () => [{ mid: 'm', direction: 'sendonly', sender: { track } }],
          },
        },
      },
      localParticipant: { trackPublications: new Map([['p', publication]]) },
      remoteParticipants: new Map(),
    } as unknown as Room;

    const monitor = new ConnectionQualityMonitor();

    // OLD loop blocked on a deferred report of its own room
    monitor.start(
      makeRoom({
        publisherGetStats: () =>
          new Promise<unknown>((resolve) => {
            oldResolvers.push(resolve);
          }),
        subscriberGetStats: () => SUBSCRIBER_REPORT,
      }),
      (s) => samplesOld.push(s),
    );
    await settle();
    expect(oldResolvers).toHaveLength(1);

    // NEW loop: sample 1 establishes the inbound (0/0) and outbound (1000) baselines
    monitor.start(newRoom, (s) => samplesNew.push(s));
    await settle();
    expect(samplesNew).toHaveLength(1);
    expect(samplesNew[0].remoteReceiveStats).toEqual([]);
    expect(samplesNew[0].isUploadAudioStuck).toBe(false);

    // the OLD await completes AFTER the new baselines exist
    oldResolvers[0](PUB_R3);
    await settle();
    expect(samplesOld).toHaveLength(0);

    // sample 2: the stale completion must not have wiped the fresh baselines
    report = [
      transport('pub-pair'),
      candidatePair('pub-pair', 0.02, { selected: true }),
      inbound('pub', 'video', 12, 100),
      outbound('o', 'audio', 1000, 0, 'm'),
      // a realistic meaningful captured signal over the interval (RMS ~0.1):
      // verified, not silence
      audioSource('mic-1', MEANINGFUL_ENERGY_PER_INTERVAL, { totalSamplesDuration: 35 }),
    ];
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samplesNew).toHaveLength(2);
    // inbound baseline survived: a real 12/100 delta is reported
    expect(samplesNew[1].remoteReceiveStats).toHaveLength(1);
    expect(samplesNew[1].remoteReceiveStats[0]).toMatchObject({
      ssrc: 'pub',
      packetsLostDelta: 12,
      packetsReceivedDelta: 100,
    });
    // one stagnant outbound observation (baseline not wiped, not yet matured)
    expect(samplesNew[1].isUploadAudioStuck).toBe(false);

    // sample 3: a second contiguous stagnant observation matures the stall,
    // proving the outbound baseline also survived
    report = [
      transport('pub-pair'),
      candidatePair('pub-pair', 0.02, { selected: true }),
      inbound('pub', 'video', 12, 100),
      outbound('o', 'audio', 1000, 0, 'm'),
      audioSource('mic-1', MEANINGFUL_ENERGY_PER_INTERVAL * 2, { totalSamplesDuration: 40 }),
    ];
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(samplesNew).toHaveLength(3);
    expect(samplesNew[2].isUploadAudioStuck).toBe(true);
  });
});

/*
 * Conservative track-level stuck detection. These two flags feed the
 * camera/audio-critical adaptation actions, so every case here is about NOT
 * reporting a stall that the evidence does not actually prove.
 */
describe('ConnectionQualityMonitor track-level stuck detection', () => {
  const nextSample = async () => {
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
  };

  /**
   * A fresh receiver report proving a Poor upload, so the benign-freeze gate
   * can never be what suppresses a stall in these tests.
   */
  const poorUplink = (timestamp: number) =>
    remoteInbound({ ssrc: 'a', fractionLost: 0.15, roundTripTime: 0.05, timestamp });

  it('never flags a camera when only one idle simulcast layer of it is stagnant', async () => {
    const samples: QualityStats[] = [];
    let timestamp = 1000;
    // two layers of the SAME camera publication (same mid + sender): dynacast
    // paused the second one, so its counters never move again
    const idleLayer = () => outbound('layer-idle', 'video', 900, 20, 'v');
    const activeLayer = (bytes: number) => outbound('layer-active', 'video', bytes, 40, 'v');
    let report: unknown = [poorUplink(timestamp), idleLayer(), activeLayer(5000)];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makePublisherRoom([CAMERA_SPEC], () => Promise.resolve(report)),
      (s) => samples.push(s),
    );

    const interval = async (bytes: number) => {
      timestamp += 1000;
      report = [poorUplink(timestamp), idleLayer(), activeLayer(bytes)];
      await nextSample();
    };

    await settle();
    // the upload truly is Poor: the suppression below is the track rule itself
    expect(samples[0].uploadQuality).toBe(PnmConnectionQuality.Poor);
    expect(samples[0].isUploadVideoStuck).toBe(false);

    await interval(6000);
    await interval(7000);
    await interval(8000);

    expect(samples).toHaveLength(4);
    expect(samples.slice(1).every((sample) => sample.isUploadVideoStuck === false)).toBe(true);
  });

  it('flags a camera once EVERY active layer of the publication stagnates for two intervals', async () => {
    const samples: QualityStats[] = [];
    let timestamp = 1000;
    const stalledLayers = (stamp: number) => [
      poorUplink(stamp),
      outbound('layer-hi', 'video', 900, 20, 'v'),
      outbound('layer-lo', 'video', 900, 40, 'v'),
    ];
    let report: unknown = stalledLayers(timestamp);

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makePublisherRoom([CAMERA_SPEC], () => Promise.resolve(report)),
      (s) => samples.push(s),
    );

    const interval = async () => {
      timestamp += 1000;
      report = stalledLayers(timestamp);
      await nextSample();
    };

    await settle();
    expect(samples[0].isUploadVideoStuck).toBe(false);

    await interval();
    // one stagnant interval is not enough
    expect(samples[1].isUploadVideoStuck).toBe(false);

    await interval();
    expect(samples[2].isUploadVideoStuck).toBe(true);
  });

  it('never flags a camera whose layers all report inactive (paused encoding)', async () => {
    const samples: QualityStats[] = [];
    let timestamp = 1000;
    let report: unknown = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makePublisherRoom([CAMERA_SPEC], () => Promise.resolve(report)),
      (s) => samples.push(s),
    );

    for (let i = 0; i < 3; i++) {
      timestamp += 1000;
      report = [
        poorUplink(timestamp),
        outbound('layer-hi', 'video', 900, 20, 'v', { active: false }),
        outbound('layer-lo', 'video', 900, 40, 'v', { active: false }),
      ];
      await nextSample();
    }

    // an explicitly inactive layer is never expected to progress, so a fully
    // inactive publication is a paused camera, not a stalled encoder
    expect(samples.every((sample) => sample.isUploadVideoStuck === false)).toBe(true);
  });

  it('never reports audio stuck for user silence or Opus DTX (flat capture energy)', async () => {
    const samples: QualityStats[] = [];
    // the source keeps producing sample DURATION while no audio energy
    // accumulates (deltaEnergy 0 -> RMS 0): the microphone captured nothing
    let duration = 30;
    const silent = () => [
      audioSource('mic-1', 10, { totalSamplesDuration: duration }),
      outbound('o', 'audio', 1000, 0, 'm'),
    ];
    let report: unknown = silent();

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makePublisherRoom([MIC_SPEC], () => Promise.resolve(report)),
      (s) => samples.push(s),
    );

    const interval = async () => {
      duration += 5;
      report = silent();
      await nextSample();
    };

    await settle();
    await interval();
    await interval();
    await interval();

    expect(samples).toHaveLength(4);
    expect(samples.every((sample) => sample.isUploadAudioStuck === false)).toBe(true);
    // and silence is not healthy link evidence either
    expect(samples[3].measured).toBe(false);
  });

  it('reports audio stuck only when a meaningful captured signal proves audio was produced but not sent', async () => {
    const samples: QualityStats[] = [];
    let energy = 0;
    let duration = 30;
    let report: unknown = [
      audioSource('mic-1', energy, { totalSamplesDuration: duration }),
      outbound('o', 'audio', 1000, 0, 'm'),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makePublisherRoom([MIC_SPEC], () => Promise.resolve(report)),
      (s) => samples.push(s),
    );

    const interval = async () => {
      energy += MEANINGFUL_ENERGY_PER_INTERVAL;
      duration += 5;
      report = [
        audioSource('mic-1', energy, { totalSamplesDuration: duration }),
        outbound('o', 'audio', 1000, 0, 'm'),
      ];
      await nextSample();
    };

    await settle();
    expect(samples[0].isUploadAudioStuck).toBe(false);

    await interval();
    // one verified stagnant interval is not enough
    expect(samples[1].isUploadAudioStuck).toBe(false);

    await interval();
    expect(samples[2].isUploadAudioStuck).toBe(true);
    // a matured, verified stall is genuine distress evidence
    expect(samples[2].measured).toBe(true);
  });

  it('uses the duration-weighted RMS floor directly: realistic captures above 0.01 mature a stall, sub-floor noise never does', async () => {
    /*
     * Direct, discriminating check of RMS = sqrt(deltaEnergy / deltaDuration)
     * at realistic amplitudes over a 5s interval. The produced duration
     * cancels, so the decision depends ONLY on energy/duration — an explicit
     * sample rate would wrongly shift every one of these.
     */
    const cases: Array<{ label: string; energyPerInterval: number; stuck: boolean }> = [
      // sqrt(0.05 / 5) = 0.1: a comfortable conversational voice
      { label: 'conversational above the floor', energyPerInterval: 0.05, stuck: true },
      // sqrt(0.0006 / 5) ≈ 0.0110: a quiet-but-real signal, just above the floor
      { label: 'just above the floor', energyPerInterval: 0.0006, stuck: true },
      // sqrt(0.0003 / 5) ≈ 0.0077: a noise-floor creep, just below the floor
      { label: 'just below the floor', energyPerInterval: 0.0003, stuck: false },
    ];

    for (const scenario of cases) {
      const samples: QualityStats[] = [];
      let energy = 0;
      let duration = 30;
      const report = () => [
        outbound('o', 'audio', 1000, 0, 'm'),
        audioSource('mic-1', energy, { totalSamplesDuration: duration }),
      ];

      const monitor = new ConnectionQualityMonitor();
      monitor.start(
        makeStuckRoom(() => Promise.resolve(report())),
        (s) => samples.push(s),
      );

      const interval = async () => {
        energy += scenario.energyPerInterval;
        duration += 5;
        await nextSample();
      };

      await settle(); // baseline
      await interval(); // one stagnant interval
      await interval(); // matures only when the capture clears the floor

      expect(samples).toHaveLength(3);
      expect(samples[1].isUploadAudioStuck, `${scenario.label}: one interval`).toBe(false);
      expect(samples[2].isUploadAudioStuck, `${scenario.label}: matured`).toBe(scenario.stuck);

      monitor.stop();
    }
  });

  it('never derives camera or audio-critical flags from screen-share sources', async () => {
    const samples: QualityStats[] = [];
    let timestamp = 1000;
    // a genuinely verified capture (meaningful energy over a produced duration)
    // so the assertion tests SOURCE exclusion, not an unverified source
    let energy = 0;
    let duration = 30;
    const specs: LocalMediaSpec[] = [
      { kind: 'video', source: 'screen_share', trackId: 'ss-video', mid: 'sv' },
      { kind: 'audio', source: 'screen_share_audio', trackId: 'ss-audio', mid: 'sa' },
    ];
    // a frozen screen share whose audio source keeps capturing: without the
    // source separation these would drive "mute own camera" / audio-only
    const frozenShare = (stamp: number) => [
      poorUplink(stamp),
      outbound('ss-v', 'video', 900, 20, 'sv'),
      outbound('ss-a', 'audio', 1000, 0, 'sa'),
      audioSource('ss-audio', energy, { totalSamplesDuration: duration }),
    ];
    let report: unknown = frozenShare(timestamp);

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makePublisherRoom(specs, () => Promise.resolve(report)),
      (s) => samples.push(s),
    );

    const interval = async () => {
      timestamp += 1000;
      energy += MEANINGFUL_ENERGY_PER_INTERVAL;
      duration += 5;
      report = frozenShare(timestamp);
      await nextSample();
    };

    await settle();
    await interval();
    await interval();
    await interval();

    expect(samples).toHaveLength(4);
    expect(samples.every((sample) => sample.isUploadVideoStuck === false)).toBe(true);
    expect(samples.every((sample) => sample.isUploadAudioStuck === false)).toBe(true);
  });

  it('never reports stuck for muted, disabled, ended or placeholder tracks', async () => {
    const cases: Array<{ label: string; spec: LocalMediaSpec }> = [
      { label: 'muted', spec: { ...CAMERA_SPEC, isMuted: true } },
      { label: 'disabled', spec: { ...CAMERA_SPEC, enabled: false } },
      { label: 'ended', spec: { ...CAMERA_SPEC, readyState: 'ended' } },
      { label: 'placeholder canvas', spec: { ...CAMERA_SPEC, label: 'canvas' } },
    ];

    for (const testCase of cases) {
      const samples: QualityStats[] = [];
      let timestamp = 1000;
      let report: unknown = [];

      const monitor = new ConnectionQualityMonitor();
      monitor.start(
        makePublisherRoom([testCase.spec], () => Promise.resolve(report)),
        (s) => samples.push(s),
      );

      for (let i = 0; i < 3; i++) {
        timestamp += 1000;
        report = [poorUplink(timestamp), outbound('v1', 'video', 900, 20, 'v')];
        await nextSample();
      }

      expect(
        samples.some((sample) => sample.isUploadVideoStuck),
        testCase.label,
      ).toBe(false);

      monitor.stop();
    }
  });

  it('never treats an absent bytesSent as zero and never poisons the baseline with it', async () => {
    const samples: QualityStats[] = [];
    let energy = 0;
    let duration = 30;
    const withoutCounter = () => ({ type: 'outbound-rtp', ssrc: 'o', kind: 'audio', mid: 'm' });
    const withCounter = () => outbound('o', 'audio', 1000, 0, 'm');
    let report: unknown = [
      audioSource('mic-1', energy, { totalSamplesDuration: duration }),
      withCounter(),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makePublisherRoom([MIC_SPEC], () => Promise.resolve(report)),
      (s) => samples.push(s),
    );

    const interval = async (counterPresent: boolean) => {
      energy += MEANINGFUL_ENERGY_PER_INTERVAL;
      duration += 5;
      report = [
        audioSource('mic-1', energy, { totalSamplesDuration: duration }),
        counterPresent ? withCounter() : withoutCounter(),
      ];
      await nextSample();
    };

    await settle(); // sample 1: a real counter establishes the baseline
    expect(samples[0].isUploadAudioStuck).toBe(false);

    await interval(false); // sample 2: the counter is absent for this interval
    expect(samples[1].isUploadAudioStuck).toBe(false);

    await interval(true); // sample 3: one stagnant interval
    expect(samples[2].isUploadAudioStuck).toBe(false);

    // sample 4 matures only because the real counter survived the absent
    // interval instead of being overwritten with a zero
    await interval(true);
    expect(samples[3].isUploadAudioStuck).toBe(true);
  });

  it('restarts the stall count on a counter reset or a publication identity change', async () => {
    const samples: QualityStats[] = [];
    let timestamp = 1000;
    let specs: LocalMediaSpec[] = [{ ...CAMERA_SPEC, trackId: 'cam-1' }];
    let report: unknown = [poorUplink(timestamp), outbound('v1', 'video', 5000, 40, 'v')];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makePublisherRoom(
        () => specs,
        () => Promise.resolve(report),
      ),
      (s) => samples.push(s),
    );

    const interval = async (bytes: number, frames: number) => {
      timestamp += 1000;
      report = [poorUplink(timestamp), outbound('v1', 'video', bytes, frames, 'v')];
      await nextSample();
    };

    await settle(); // baseline
    await interval(5000, 40); // one stagnant interval
    expect(samples[1].isUploadVideoStuck).toBe(false);

    // an encoder restart resets the counters: the stall count restarts too
    await interval(10, 1);
    expect(samples[2].isUploadVideoStuck).toBe(false);
    await interval(10, 1);
    expect(samples[3].isUploadVideoStuck).toBe(false);

    // the user switches camera: same SSRC and mid, new publication/track
    // identity, so the previous stall may not carry over
    specs = [{ ...CAMERA_SPEC, trackId: 'cam-2' }];
    await interval(10, 1);
    expect(samples[4].isUploadVideoStuck).toBe(false);
    await interval(10, 1);
    expect(samples[5].isUploadVideoStuck).toBe(false);
    await interval(10, 1);
    expect(samples[6].isUploadVideoStuck).toBe(true);
  });

  it('never verifies a mic stall from a low noise floor that keeps creeping', async () => {
    const samples: QualityStats[] = [];
    let energy = 0;
    let duration = 30;
    // the bytes are frozen and the source keeps producing samples, but the
    // energy only creeps at a realistic noise-floor level (RMS ~0.0063, below
    // the 0.01 floor): not a meaningful signal, so Opus DTX/silence can never
    // mature a false audio-stuck
    const report = () => [
      outbound('o', 'audio', 1000, 0, 'm'),
      audioSource('mic-1', energy, { totalSamplesDuration: duration }),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeStuckRoom(() => Promise.resolve(report())),
      (s) => samples.push(s),
    );

    const interval = async () => {
      energy += NOISE_FLOOR_ENERGY_PER_INTERVAL;
      duration += 5;
      await nextSample();
    };

    await settle();
    await interval();
    await interval();
    await interval();

    expect(samples).toHaveLength(4);
    expect(samples.every((sample) => sample.isUploadAudioStuck === false)).toBe(true);
    // the noise floor is likewise not healthy link evidence
    expect(samples[3].measured).toBe(false);
  });

  it('never flags an inactive mic outbound and does not carry stall intervals into reactivation', async () => {
    const samples: QualityStats[] = [];
    let energy = 0;
    let duration = 30;
    let active = false;
    // a meaningful captured signal the whole time, but the spec reports the
    // outbound as inactive: it is not expected to send, so the frozen counters
    // must never mature a stall
    const report = () => [
      outbound('o', 'audio', 1000, 0, 'm', { active }),
      audioSource('mic-1', energy, { totalSamplesDuration: duration }),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeStuckRoom(() => Promise.resolve(report())),
      (s) => samples.push(s),
    );

    const interval = async () => {
      energy += MEANINGFUL_ENERGY_PER_INTERVAL;
      duration += 5;
      await nextSample();
    };

    await settle();
    await interval();
    await interval();
    await interval();
    expect(samples.every((sample) => sample.isUploadAudioStuck === false)).toBe(true);

    // reactivation: the inactive intervals must NOT have accumulated a stall,
    // so the fast path re-matures from a fresh count, not immediately
    active = true;
    await interval();
    expect(samples[4].isUploadAudioStuck).toBe(false);
    await interval();
    expect(samples[5].isUploadAudioStuck).toBe(true);
  });

  it('cannot verify a mic stall through a mediaSourceId linked to an unrelated capture track', async () => {
    const samples: QualityStats[] = [];
    let energy = 0;
    let duration = 30;
    // the mic outbound (sender track mic-1) points its mediaSourceId at a
    // DIFFERENT, actively-capturing source: the identity mismatch must not be
    // read as proof that mic-1 produced audio
    const report = () => [
      outbound('o', 'audio', 1000, 0, 'm', { mediaSourceId: 'src-other' }),
      audioSource('other-track', energy, { id: 'src-other', totalSamplesDuration: duration }),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeStuckRoom(() => Promise.resolve(report())),
      (s) => samples.push(s),
    );

    const interval = async () => {
      energy += MEANINGFUL_ENERGY_PER_INTERVAL;
      duration += 5;
      await nextSample();
    };

    await settle();
    await interval();
    await interval();
    await interval();

    expect(samples).toHaveLength(4);
    expect(samples.every((sample) => sample.isUploadAudioStuck === false)).toBe(true);
  });

  it('stop/start on the same track id re-establishes the capture baseline (no carried stall)', async () => {
    const samples: QualityStats[] = [];
    let energy = 0;
    let duration = 30;
    const report = () => [
      outbound('o', 'audio', 1000, 0, 'm'),
      audioSource('mic-1', energy, { totalSamplesDuration: duration }),
    ];
    const room = makeStuckRoom(() => Promise.resolve(report()));

    const monitor = new ConnectionQualityMonitor();
    monitor.start(room, (s) => samples.push(s));

    const interval = async () => {
      energy += MEANINGFUL_ENERGY_PER_INTERVAL;
      duration += 5;
      await nextSample();
    };

    await settle(); // baseline
    await interval(); // one verified stagnant interval
    await interval(); // matures and is carried into the stop
    expect(samples[2].isUploadAudioStuck).toBe(true);

    monitor.stop();
    monitor.start(room, (s) => samples.push(s));

    // the restarted run must re-baseline BOTH the outbound counters and the
    // captured signal, so nothing matured before the stop carries over
    await settle();
    expect(samples[3].isUploadAudioStuck).toBe(false);

    await interval(); // one fresh verified stagnant interval
    expect(samples[4].isUploadAudioStuck).toBe(false);
    await interval(); // re-matures from scratch
    expect(samples[5].isUploadAudioStuck).toBe(true);
  });
});

/*
 * Realistic dual-PeerConnection sessions: both the publisher and the subscriber
 * reports are processed every interval, so a stall matured by one report must
 * survive the other report's (empty) outbound pass.
 */
describe('ConnectionQualityMonitor dual-PC stall persistence', () => {
  it('keeps a verified mic stall across subscriber report processing in a healthy dual-PC session', async () => {
    const samples: QualityStats[] = [];
    let energy = 0;
    let duration = 30;
    let subReceived = 0;

    const publisherReport = () => [
      transport('pub-pair'),
      candidatePair('pub-pair', 0.02, { selected: true }),
      outbound('o', 'audio', 1000, 0, 'm'),
      audioSource('mic-1', energy, { totalSamplesDuration: duration }),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeDualRoom({
        specs: [MIC_SPEC],
        publisherReport: () => Promise.resolve(publisherReport()),
        subscriberReport: () => Promise.resolve(healthySubscriberReport(subReceived)),
      }),
      (s) => samples.push(s),
    );

    const interval = async () => {
      energy += MEANINGFUL_ENERGY_PER_INTERVAL;
      duration += 5;
      subReceived += 100;
      await vi.advanceTimersByTimeAsync(5000);
      await settle();
    };

    await settle(); // baseline
    expect(samples[0].isUploadAudioStuck).toBe(false);

    await interval(); // one verified stagnant interval
    expect(samples[1].isUploadAudioStuck).toBe(false);

    // the stall matures in the PUBLISHER report; the subscriber report that is
    // processed next must not clear it
    await interval();
    expect(samples[2].isUploadAudioStuck).toBe(true);
    expect(samples[2].measured).toBe(true);
    // and the receive path uses the subscriber's own selected-pair RTT
    expect(samples[2].receiveRtt).toBeCloseTo(30, 5);

    // still flagged on the next interval's subscriber report
    await interval();
    expect(samples[3].isUploadAudioStuck).toBe(true);
  });

  it('keeps a matured camera stall across subscriber report processing when the publisher RTT is Poor', async () => {
    const samples: QualityStats[] = [];
    let timestamp = 1000;
    let subReceived = 0;
    const stalledLayers = () => [
      remoteInbound({ ssrc: 'a', fractionLost: 0.15, roundTripTime: 0.05, timestamp }),
      outbound('layer-hi', 'video', 900, 20, 'v'),
      outbound('layer-lo', 'video', 900, 40, 'v'),
    ];
    let publisherReport: unknown = stalledLayers();

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeDualRoom({
        specs: [CAMERA_SPEC],
        publisherReport: () => Promise.resolve(publisherReport),
        subscriberReport: () => Promise.resolve(healthySubscriberReport(subReceived)),
      }),
      (s) => samples.push(s),
    );

    const interval = async () => {
      timestamp += 1000;
      subReceived += 100;
      publisherReport = stalledLayers();
      await vi.advanceTimersByTimeAsync(5000);
      await settle();
    };

    await settle(); // baseline
    expect(samples[0].isUploadVideoStuck).toBe(false);

    await interval(); // one stagnant interval
    expect(samples[1].isUploadVideoStuck).toBe(false);

    // every active layer stagnates: the stall matures in the publisher report
    await interval();
    expect(samples[2].uploadQuality).toBe(PnmConnectionQuality.Poor);
    expect(samples[2].isUploadVideoStuck).toBe(true);

    // persists across the next subscriber report
    await interval();
    expect(samples[3].isUploadVideoStuck).toBe(true);
  });
});

/*
 * Directional evidence under a partial (non-global) report: a verified upload
 * audio stall must stay visible (uploadMeasured:true) even when the download
 * direction's report is unusable and the sample is therefore NOT globally
 * measured.
 */
describe('ConnectionQualityMonitor directional evidence under partial reports', () => {
  const nextSample = async () => {
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
  };

  it('keeps uploadMeasured true for a verified upload audio stall when the expected subscriber report is unusable', async () => {
    const samples: QualityStats[] = [];
    let energy = 0;
    let duration = 30;

    const publisherReport = () => [
      transport('pub-pair'),
      candidatePair('pub-pair', 0.02, { selected: true }),
      outbound('o', 'audio', 1000, 0, 'm'),
      audioSource('mic-1', energy, { totalSamplesDuration: duration }),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeDualRoom({
        specs: [MIC_SPEC],
        publisherReport: () => Promise.resolve(publisherReport()),
        // the download direction is EXPECTED (needsSubscriber + subscribed
        // media) but its report is empty: it proves nothing about the link
        subscriberReport: () => Promise.resolve([]),
      }),
      (s) => samples.push(s),
    );

    const interval = async () => {
      energy += MEANINGFUL_ENERGY_PER_INTERVAL;
      duration += 5;
      await nextSample();
    };

    await settle(); // baseline
    await interval(); // one verified stagnant interval
    await interval(); // matures

    const partial = samples[2];
    expect(partial.isUploadAudioStuck).toBe(true);
    // the download direction is unknown -> the sample is NOT globally measured
    expect(partial.measured).toBe(false);
    // ...but the upload direction's own report proved the stall
    expect(partial.uploadMeasured).toBe(true);
    expect(partial.receiveMeasured).toBe(false);
  });

  it('keeps uploadMeasured true when the expected subscriber report rejects entirely', async () => {
    const samples: QualityStats[] = [];
    let energy = 0;
    let duration = 30;

    const publisherReport = () => [
      transport('pub-pair'),
      candidatePair('pub-pair', 0.02, { selected: true }),
      outbound('o', 'audio', 1000, 0, 'm'),
      audioSource('mic-1', energy, { totalSamplesDuration: duration }),
    ];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeDualRoom({
        specs: [MIC_SPEC],
        publisherReport: () => Promise.resolve(publisherReport()),
        subscriberReport: () => Promise.reject(new Error('subscriber getStats failed')),
      }),
      (s) => samples.push(s),
    );

    const interval = async () => {
      energy += MEANINGFUL_ENERGY_PER_INTERVAL;
      duration += 5;
      await nextSample();
    };

    await settle();
    await interval();
    await interval();

    const partial = samples[2];
    expect(partial.isUploadAudioStuck).toBe(true);
    expect(partial.measured).toBe(false);
    expect(partial.uploadMeasured).toBe(true);
    expect(partial.receiveMeasured).toBe(false);
  });
});

/*
 * Publisher-only single-PC topology (LiveKit SDK V1 join path): ONE publisher
 * transport carries BOTH RTP directions and there is NO subscriber
 * PeerConnection, so Promise.allSettled(subscriber?.getStats()) yields a
 * fulfilled `undefined` with no subscriber report. The direction routing is
 * keyed on the public `pcManager.mode`, never on a missing subscriber report
 * or needsSubscriber === false (a dual-PC publisher-primary session has the
 * same role flags but a real, separate subscriber).
 */
describe('ConnectionQualityMonitor publisher-only single-PC direction routing', () => {
  it('routes a single-PC publisher-only selected-pair RTT to BOTH directions', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        mode: 'publisher-only',
        needsPublisher: true,
        needsSubscriber: false,
        // subscribed remote media proves the download direction is expected
        // even though needsSubscriber is false and there is no subscriber PC
        remoteParticipants: subscribedRemoteParticipants(),
        publisherGetStats: () =>
          Promise.resolve([
            transport('pub-pair'),
            candidatePair('pub-pair', 0.02, { selected: true }),
            inbound('pub', 'audio', 0, 100),
          ]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].uploadMeasured).toBe(true);
    expect(samples[0].receiveMeasured).toBe(true);
    // the one transport's selected-pair RTT is the receive RTT too
    expect(samples[0].uploadRtt).toBe(20);
    expect(samples[0].receiveRtt).toBe(20);
    expect(samples[0].measured).toBe(true);
  });

  it('treats a real inbound delta as receive-only evidence (upload expected, sample unmeasured)', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    let received = 0;
    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        mode: 'publisher-only',
        needsPublisher: true,
        needsSubscriber: false,
        remoteParticipants: subscribedRemoteParticipants(),
        // ONLY an inbound-rtp stream: no selected pair, no receiver report and
        // no outbound activity, so nothing here can prove the UPLOAD direction
        publisherGetStats: () => Promise.resolve([inbound('pub', 'audio', 0, received)]),
      }),
      (s) => samples.push(s),
    );

    await settle(); // baseline: no delta yet

    received = 100;
    await vi.advanceTimersByTimeAsync(5000);
    await settle();

    const partial = samples[1];
    expect(partial.receiveMeasured).toBe(true);
    expect(partial.uploadMeasured).toBe(false);
    // the upload direction is expected (needsPublisher) and unknown -> unmeasured
    expect(partial.measured).toBe(false);
  });

  it('treats a fresh receiver report as upload-only evidence (receive expected stays unmeasured)', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        mode: 'publisher-only',
        needsPublisher: true,
        needsSubscriber: false,
        // subscribed remote media keeps the receive direction expected even
        // though needsSubscriber is false and there is no subscriber PC
        remoteParticipants: subscribedRemoteParticipants(),
        // ONLY a fresh receiver report: it proves our outbound RTP reached the
        // peer, but nothing about the receive direction
        publisherGetStats: () =>
          Promise.resolve([
            remoteInbound({ ssrc: 'a', fractionLost: 0, roundTripTime: 0.02, timestamp: 1000 }),
          ]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].uploadMeasured).toBe(true);
    expect(samples[0].receiveMeasured).toBe(false);
    expect(samples[0].receiveRtt).toBeNull();
    expect(samples[0].measured).toBe(false);
  });

  it('does not borrow the publisher RTT for receive in a dual-PC session (single-PC role flags, unusable receive stays unmeasured)', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        // dual-PC publisher-primary: a separate subscriber PC exists but the
        // role flags are IDENTICAL to a single-PC session (needsSubscriber
        // false); only the mode tells them apart
        mode: 'publisher-primary',
        needsPublisher: true,
        needsSubscriber: false,
        remoteParticipants: subscribedRemoteParticipants(),
        publisherGetStats: () =>
          Promise.resolve([
            transport('pub-pair'),
            candidatePair('pub-pair', 0.02, { selected: true }),
          ]),
        // a present-but-empty subscriber report proves nothing about receive
        subscriberGetStats: () => Promise.resolve([]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].uploadMeasured).toBe(true);
    expect(samples[0].receiveMeasured).toBe(false);
    // the publisher's transport RTT must never leak into the receive path
    expect(samples[0].receiveRtt).toBeNull();
    expect(samples[0].measured).toBe(false);
  });

  it('accepts a zero single-PC selected-pair RTT as a valid measurement for both directions', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        mode: 'publisher-only',
        needsPublisher: true,
        needsSubscriber: false,
        // subscribed remote media makes the receive direction realistically
        // expected without a subscriber PC or a needsSubscriber flag
        remoteParticipants: subscribedRemoteParticipants(),
        publisherGetStats: () =>
          Promise.resolve([
            transport('pub-pair'),
            candidatePair('pub-pair', 0, { selected: true }),
          ]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].uploadMeasured).toBe(true);
    expect(samples[0].receiveMeasured).toBe(true);
    expect(samples[0].uploadRtt).toBe(0);
    expect(samples[0].receiveRtt).toBe(0);
    expect(samples[0].measured).toBe(true);
  });
});

/*
 * Cross-report direction aggregation: a direction is a property of the RTP, not
 * of the report that happens to carry its evidence. A receiver report always
 * describes OUR outbound RTP (upload) and an inbound-rtp delta always describes
 * OUR download (receive), so the same evidence must be credited to its own
 * direction even when it arrives on the "other" report.
 */
describe('ConnectionQualityMonitor cross-report direction aggregation', () => {
  it('credits a fresh receiver report carried by the subscriber report to the upload direction only', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        // dual-PC: a real, separate subscriber report carries the receiver report
        mode: 'publisher-primary',
        needsPublisher: true,
        needsSubscriber: true,
        // the publisher report proves nothing on its own
        publisherGetStats: () => Promise.resolve([]),
        // an RR always reports on OUR outbound RTP, so its upload evidence must
        // count even though the report carrying it is the subscriber's
        subscriberGetStats: () =>
          Promise.resolve([
            remoteInbound({ ssrc: 'a', fractionLost: 0, roundTripTime: 0.02, timestamp: 1000 }),
          ]),
      }),
      (s) => samples.push(s),
    );

    await settle();
    expect(samples[0].uploadMeasured).toBe(true);
    // ...but it is NOT receive evidence: the download direction stays unmeasured
    expect(samples[0].receiveMeasured).toBe(false);
    expect(samples[0].receiveRtt).toBeNull();
    expect(samples[0].measured).toBe(false);
  });

  it('credits receive only from a real inbound delta carried by the publisher report in dual mode', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    let received = 0;
    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        mode: 'publisher-primary',
        needsPublisher: true,
        needsSubscriber: false,
        remoteParticipants: subscribedRemoteParticipants(),
        // ONLY an inbound-rtp stream: no selected pair, no receiver report and
        // no outbound activity, so nothing here can prove the UPLOAD direction
        // even though the report carrying the delta is the publisher's
        publisherGetStats: () => Promise.resolve([inbound('pub', 'audio', 0, received)]),
        subscriberGetStats: () => Promise.resolve([]),
      }),
      (s) => samples.push(s),
    );

    await settle(); // baseline: no delta yet

    received = 100;
    await vi.advanceTimersByTimeAsync(5000);
    await settle();

    const sample = samples[1];
    expect(sample.receiveMeasured).toBe(true);
    // the inbound delta is RECEIVE evidence only, never upload
    expect(sample.uploadMeasured).toBe(false);
    expect(sample.receiveRtt).toBeNull();
    // upload is expected (needsPublisher) and still unknown -> unmeasured
    expect(sample.measured).toBe(false);
  });

  it('credits receive from the inbound delta while the publisher RTT stays upload-only (no borrowing)', async () => {
    vi.mocked(store.dispatch).mockClear();
    const samples: QualityStats[] = [];

    let received = 0;
    const monitor = new ConnectionQualityMonitor();
    monitor.start(
      makeRoom({
        // dual-PC: the publisher transport routes RTT to upload only
        mode: 'publisher-primary',
        needsPublisher: true,
        needsSubscriber: false,
        remoteParticipants: subscribedRemoteParticipants(),
        publisherGetStats: () =>
          Promise.resolve([
            transport('pub-pair'),
            candidatePair('pub-pair', 0.02, { selected: true }),
            inbound('pub', 'audio', 0, received),
          ]),
        // the subscriber report proves nothing about the receive direction
        subscriberGetStats: () => Promise.resolve([]),
      }),
      (s) => samples.push(s),
    );

    await settle(); // baseline: no inbound delta yet

    received = 100;
    await vi.advanceTimersByTimeAsync(5000);
    await settle();

    const sample = samples[1];
    // the selected-pair RTT credits upload and is NEVER borrowed for receive
    expect(sample.uploadMeasured).toBe(true);
    expect(sample.uploadRtt).toBe(20);
    expect(sample.receiveRtt).toBeNull();
    // ...while the real inbound delta is genuine receive evidence
    expect(sample.receiveMeasured).toBe(true);
    expect(sample.measured).toBe(true);
  });
});
