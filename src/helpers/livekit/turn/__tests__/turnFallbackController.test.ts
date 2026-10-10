import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Room } from 'livekit-client';
import { type TurnCredentials } from 'plugnmeet-protocol-js';
import { toast } from 'react-toastify';

import { isFirefoxMobile } from '../../../utils';
import TurnFallbackController from '../TurnFallbackController';
import type { MediaAdaptationSnapshot } from '../TurnFallbackCoordinator';
import type { TurnFallbackSample } from '../TurnFallbackController';

/*
 * Integration-style tests for TurnFallbackController: the controller runs
 * against a mocked room/engine/pcManager; livekit-client, toast, i18n and
 * utils are mocked at import time. `document` is stubbed globally because
 * boundary checks read document.hidden.
 */

vi.mock('livekit-client', () => ({
  ConnectionState: {
    Connected: 'connected',
    Connecting: 'connecting',
    Reconnecting: 'reconnecting',
    Disconnected: 'disconnected',
  },
}));

vi.mock('react-toastify', () => ({
  toast: { info: vi.fn() },
}));

vi.mock('../../../i18n', () => ({
  default: { t: (key: string) => key },
}));

vi.mock('../../../utils', () => ({
  isFirefoxMobile: vi.fn(() => false),
}));

type FakePcManager = {
  needsPublisher: boolean;
  publisher?: { getStats: () => Promise<unknown> };
  subscriber?: { getStats: () => Promise<unknown> };
  updateConfiguration: ReturnType<typeof vi.fn>;
};

type FakeEngine = { pcManager?: FakePcManager; rtcConfig?: RTCConfiguration };
type FakeRoom = { state: string; engine: FakeEngine };

const FULL_MEDIA: MediaAdaptationSnapshot = { degradedMedia: false };
const REDUCED_MEDIA: MediaAdaptationSnapshot = { degradedMedia: true };

const MONITOR_INTERVAL_MS = 5000;

function createFakeRoom(
  options: {
    state?: string;
    needsPublisher?: boolean;
    publisherStats?: () => Promise<unknown>;
    subscriberStats?: () => Promise<unknown>;
    withPcManager?: boolean;
    throwOnUpdate?: boolean;
  } = {},
) {
  const engine: FakeEngine = { rtcConfig: { iceServers: [] } };
  if (options.withPcManager !== false) {
    engine.pcManager = {
      needsPublisher: options.needsPublisher ?? true,
      publisher: options.publisherStats ? { getStats: options.publisherStats } : undefined,
      subscriber: options.subscriberStats ? { getStats: options.subscriberStats } : undefined,
      updateConfiguration: vi.fn(() => {
        if (options.throwOnUpdate) throw new Error('update failed');
      }),
    };
  }
  const room: FakeRoom = { state: options.state ?? 'connected', engine };
  return room;
}

function makeCredential(overrides: Partial<TurnCredentials> = {}): TurnCredentials {
  return {
    username: 'user',
    password: 'secret',
    uris: ['turn:turn.invalid'],
    forceTurn: false,
    fallbackTurn: true,
    fallbackTimerDuration: '30000',
    fallbackOnFlapping: undefined,
    ...overrides,
  } as TurnCredentials;
}

let controllers: TurnFallbackController[] = [];

function createController(
  room: FakeRoom,
  mediaSnapshot: () => MediaAdaptationSnapshot = () => FULL_MEDIA,
) {
  const controller = new TurnFallbackController((): Room => room as unknown as Room, mediaSnapshot);
  controllers.push(controller);
  return controller;
}

/** sequential 5s-cadence evaluator */
function createFeeder(controller: TurnFallbackController, startAtMs = 0) {
  let clock = startAtMs;
  return {
    feed(overrides: Partial<Omit<TurnFallbackSample, 'atMs'>> = {}) {
      clock += MONITOR_INTERVAL_MS;
      const sample: TurnFallbackSample = {
        atMs: clock,
        measured: true,
        uploadQuality: 'excellent',
        receiveQuality: 'excellent',
        isMyConnectionPoor: false,
        isReceivingPoor: false,
        isLikelyDownloadIssue: false,
        isUploadAudioStuck: false,
        ...overrides,
      };
      controller.evaluate(sample);
    },
    clock: () => clock,
  };
}

/** stats fixtures: one relay/direct selected transport pair */
const directStats = (): unknown[] => [
  { type: 'transport', selectedCandidatePairId: 'dp' },
  { type: 'local-candidate', candidateType: 'host', id: 'dp-c' },
  {
    id: 'dp',
    type: 'candidate-pair',
    state: 'succeeded',
    selected: true,
    localCandidateId: 'dp-c',
  },
];

const relayStats = (): unknown[] => [
  { type: 'transport', selectedCandidatePairId: 'rp' },
  { type: 'local-candidate', candidateType: 'relay', id: 'rp-c' },
  {
    id: 'rp',
    type: 'candidate-pair',
    state: 'succeeded',
    selected: true,
    localCandidateId: 'rp-c',
  },
];

const directGetter = async () => directStats();
const relayGetter = async () => relayStats();

/** drains the async chain of an attempt (probe/verification microtasks) */
async function settle(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    await Promise.resolve();
  }
}

describe('TurnFallbackController', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('document', { hidden: false });
    consoleWarnSpy = vi.spyOn(console, 'warn');
    consoleLogSpy = vi.spyOn(console, 'log');
    consoleErrorSpy = vi.spyOn(console, 'error');
  });

  afterEach(() => {
    vi.useRealTimers();
    controllers.forEach((c) => c.dispose()); // cancels any in-flight verification
    controllers = [];
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.mocked(isFirefoxMobile).mockImplementation(() => false);
  });

  it('runs the full migration: fires, toasts, applies relay-only config with explicit publisher restart, then never re-migrates', async () => {
    const room = createFakeRoom({ publisherStats: directGetter, subscriberStats: directGetter });
    const controller = createController(room);
    controller.configure({
      ...makeCredential(),
      fallbackOnFlapping: {
        enabled: true,
        maxPoorConnCount: 3,
        checkDurationInSec: 120,
      } as unknown as TurnCredentials['fallbackOnFlapping'],
    });
    const feeder = createFeeder(controller);

    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    expect(toast.info).not.toHaveBeenCalled();
    await settle();
    expect(toast.info).not.toHaveBeenCalled();

    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(room.engine.pcManager?.updateConfiguration).toHaveBeenCalledTimes(1);
    expect(
      (room.engine.pcManager!.updateConfiguration as ReturnType<typeof vi.fn>).mock.calls[0][0],
    ).toMatchObject({ iceTransportPolicy: 'relay' });
    expect(
      (room.engine.pcManager!.updateConfiguration as ReturnType<typeof vi.fn>).mock.calls[0][1],
    ).toBe(true);
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBe('relay');

    // one deliberate migration per session: further firing samples do nothing
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(room.engine.pcManager?.updateConfiguration).toHaveBeenCalledTimes(1);
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBe('relay');
  });

  it('honors a finite positive server timer override (sustained window)', async () => {
    const room = createFakeRoom({ publisherStats: directGetter, subscriberStats: directGetter });
    const controller = createController(room);
    controller.configure(makeCredential({ fallbackTimerDuration: '60000' }));
    const feeder = createFeeder(controller);

    for (let i = 0; i < 12; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).not.toHaveBeenCalled(); // 55s elapsed < 60s window

    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true }); // 60s elapsed
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBe('relay');
  });

  it('rejects non-finite/non-positive config and falls back to defaults', async () => {
    const room = createFakeRoom({ publisherStats: directGetter, subscriberStats: directGetter });
    const controller = createController(room);
    controller.configure(
      makeCredential({
        fallbackTimerDuration: '0',
        fallbackOnFlapping: {
          enabled: true,
          maxPoorConnCount: Number.NaN,
          checkDurationInSec: Number.NaN,
        } as unknown as TurnCredentials['fallbackOnFlapping'],
      }),
    );
    const feeder = createFeeder(controller);

    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).not.toHaveBeenCalled(); // flapping default: 3 samples

    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(room.engine.pcManager?.updateConfiguration).toHaveBeenCalledTimes(1);
  });

  it('degrades to the default sustained window without a valid server timer', async () => {
    const room = createFakeRoom({ publisherStats: directGetter, subscriberStats: directGetter });
    const controller = createController(room);
    controller.configure(makeCredential({ fallbackTimerDuration: 'NaN' }));
    const feeder = createFeeder(controller);

    for (let i = 0; i < 6; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true }); // 25s elapsed < 30s
    await settle();
    expect(toast.info).not.toHaveBeenCalled();

    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true }); // 30s elapsed, 100% poor
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it('does nothing without configured credentials', async () => {
    const room = createFakeRoom({ publisherStats: directGetter, subscriberStats: directGetter });
    const controller = createController(room);
    const feeder = createFeeder(controller);
    for (let i = 0; i < 8; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).not.toHaveBeenCalled();
    expect(room.engine.pcManager?.updateConfiguration).not.toHaveBeenCalled();
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBeUndefined();
  });

  it('is disabled when fallbackTurn is false', async () => {
    const room = createFakeRoom({ publisherStats: directGetter, subscriberStats: directGetter });
    const controller = createController(room);
    controller.configure(makeCredential({ fallbackTurn: false }));
    const feeder = createFeeder(controller);
    for (let i = 0; i < 8; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('is disabled on Firefox mobile', async () => {
    const room = createFakeRoom({ publisherStats: directGetter, subscriberStats: directGetter });
    const controller = createController(room);
    controller.configure(makeCredential());
    // a UA probe is stable within a session: it stays true for every sample
    vi.mocked(isFirefoxMobile).mockImplementation(() => true);
    const feeder = createFeeder(controller);
    for (let i = 0; i < 8; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('cannot migrate when the room is not connected (no measured evidence)', async () => {
    const room = createFakeRoom({
      state: 'reconnecting',
      publisherStats: directGetter,
      subscriberStats: directGetter,
    });
    const controller = createController(room);
    controller.configure(makeCredential());
    const feeder = createFeeder(controller);
    for (let i = 0; i < 8; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).not.toHaveBeenCalled();
    expect(room.engine.pcManager?.updateConfiguration).not.toHaveBeenCalled();
  });

  it('defers migrations while the document is hidden and proceeds once visible', async () => {
    const room = createFakeRoom({ publisherStats: directGetter, subscriberStats: directGetter });
    const controller = createController(room);
    controller.configure(makeCredential());
    (document as { hidden: boolean }).hidden = true;

    const feeder = createFeeder(controller);
    for (let i = 0; i < 8; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).not.toHaveBeenCalled();
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBeUndefined();

    (document as { hidden: boolean }).hidden = false;
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true }); // decision still qualifies
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBe('relay');
  });

  it('recognizes an already-relay selected path instead of re-migrating', async () => {
    const room = createFakeRoom({ publisherStats: relayGetter, subscriberStats: relayGetter });
    const controller = createController(room);
    controller.configure({
      ...makeCredential(),
      fallbackOnFlapping: {
        enabled: true,
        maxPoorConnCount: 2,
        checkDurationInSec: 120,
      } as unknown as TurnCredentials['fallbackOnFlapping'],
    });
    const feeder = createFeeder(controller);

    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();

    expect(toast.info).not.toHaveBeenCalled();
    expect(room.engine.pcManager?.updateConfiguration).not.toHaveBeenCalled();
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBeUndefined();
    expect(consoleLogSpy.mock.calls.some((c) => String(c[0]).includes('relay verified'))).toBe(
      true,
    );

    // session is settled: recognition consumed the single attempt budget
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).not.toHaveBeenCalled();
    expect(room.engine.pcManager?.updateConfiguration).not.toHaveBeenCalled();
  });

  it('recognizes an already relay-only config instead of re-migrating', async () => {
    // observed path is direct, but the configuration is already relay-only
    const room = createFakeRoom({ publisherStats: directGetter, subscriberStats: directGetter });
    room.engine.rtcConfig = { iceTransportPolicy: 'relay', iceServers: [] };
    const controller = createController(room);
    controller.configure({
      ...makeCredential(),
      fallbackOnFlapping: {
        enabled: true,
        maxPoorConnCount: 2,
        checkDurationInSec: 120,
      } as unknown as TurnCredentials['fallbackOnFlapping'],
    });
    const feeder = createFeeder(controller);

    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();

    expect(toast.info).not.toHaveBeenCalled();
    expect(room.engine.pcManager?.updateConfiguration).not.toHaveBeenCalled();
  });

  it('discards a deferred probe result after a lifecycle boundary and lets a later attempt migrate', async () => {
    let resolvePublisher: (value: unknown) => void = () => undefined;
    let publisherDeferred = true;
    const room = createFakeRoom({
      publisherStats: () => {
        if (!publisherDeferred) return directGetter();
        publisherDeferred = false;
        return new Promise<unknown>((resolve) => {
          resolvePublisher = resolve;
        });
      },
      subscriberStats: directGetter,
    });
    const controller = createController(room);
    controller.configure({
      ...makeCredential(),
      fallbackOnFlapping: {
        enabled: true,
        maxPoorConnCount: 2,
        checkDurationInSec: 120,
      } as unknown as TurnCredentials['fallbackOnFlapping'],
    });
    const feeder = createFeeder(controller);

    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    // deferred probe in flight: cross the boundary exactly then
    expect(typeof resolvePublisher).toBe('function');
    controller.resetEvidence();
    resolvePublisher(directStats());
    await settle();

    expect(toast.info).not.toHaveBeenCalled();
    expect(room.engine.pcManager?.updateConfiguration).not.toHaveBeenCalled();
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBeUndefined();

    // a fresh attempt after the boundary still migrates normally
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBe('relay');
  });

  it.each([
    ['unload', (controller: TurnFallbackController) => controller.onUnload()],
    ['connected', (controller: TurnFallbackController) => controller.onConnectionEstablished()],
  ])('invalidates an in-flight attempt at the %s boundary', async (_name, boundary) => {
    let resolvePublisher: (value: unknown) => void = () => undefined;
    let publisherDeferred = true;
    const room = createFakeRoom({
      publisherStats: () => {
        if (!publisherDeferred) return directGetter();
        publisherDeferred = false;
        return new Promise<unknown>((resolve) => {
          resolvePublisher = resolve;
        });
      },
      subscriberStats: directGetter,
    });
    const controller = createController(room);
    controller.configure({
      ...makeCredential(),
      fallbackOnFlapping: {
        enabled: true,
        maxPoorConnCount: 2,
        checkDurationInSec: 120,
      } as unknown as TurnCredentials['fallbackOnFlapping'],
    });
    const feeder = createFeeder(controller);

    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    boundary(controller);
    resolvePublisher(directStats());
    await settle();

    expect(toast.info).not.toHaveBeenCalled();
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBeUndefined();

    // a later attempt again works (the previous one was invalidated, not consumed)
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBe('relay');
  });

  it('rolls back the engine rtcConfig when updateConfiguration throws and honors the retry budget', async () => {
    const previousConfig: RTCConfiguration = { iceServers: [] };
    const room = createFakeRoom({
      publisherStats: directGetter,
      subscriberStats: directGetter,
      throwOnUpdate: true,
    });
    room.engine.rtcConfig = previousConfig;
    const controller = createController(room);
    controller.configure(makeCredential());
    const feeder = createFeeder(controller);

    for (let i = 0; i < 7; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true }); // fire at 30s
    await settle();
    expect(room.engine.rtcConfig).toBe(previousConfig); // rolled back honestly
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(room.engine.pcManager!.updateConfiguration).toHaveBeenCalledTimes(1);
    expect(
      (room.engine.pcManager!.updateConfiguration as ReturnType<typeof vi.fn>).mock.calls[0][0],
    ).toMatchObject({ iceTransportPolicy: 'relay' });
    expect(consoleErrorSpy.mock.calls.some((c) => String(c[0]).includes('Migration failed'))).toBe(
      true,
    );

    // budget still open (1/2): the continued distress retries once
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(room.engine.rtcConfig).toBe(previousConfig);
    expect(room.engine.pcManager!.updateConfiguration).toHaveBeenCalledTimes(2);

    // budget exhausted (2/2): further firing samples never retry
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(room.engine.pcManager!.updateConfiguration).toHaveBeenCalledTimes(2);
  });

  it('blocks further attempts after two init failures and restores the session budget on dispose', async () => {
    const room = createFakeRoom({ withPcManager: false });
    const controller = createController(room);
    controller.configure(makeCredential());
    const feeder = createFeeder(controller);

    for (let i = 0; i < 8; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    const pcErrorCount = consoleErrorSpy.mock.calls.filter((c) =>
      String(c[0]).includes('pc manager unavailable'),
    ).length;
    expect(pcErrorCount).toBe(2);

    for (let i = 0; i < 3; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    expect(
      consoleErrorSpy.mock.calls.filter((c) => String(c[0]).includes('pc manager unavailable'))
        .length,
    ).toBe(2);

    // full session reset: the budget and all evidence start over (budget
    // allows two more bounded retries in the new session)
    controller.dispose();
    const feeder2 = createFeeder(controller, 100_000);
    for (let i = 0; i < 8; i++) feeder2.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    expect(
      consoleErrorSpy.mock.calls.filter((c) => String(c[0]).includes('pc manager unavailable'))
        .length,
    ).toBe(4);

    for (let i = 0; i < 3; i++) feeder2.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    expect(
      consoleErrorSpy.mock.calls.filter((c) => String(c[0]).includes('pc manager unavailable'))
        .length,
    ).toBe(4);
  });

  it('runs subscriber-only verification, confirms on later relay evidence, and stops polling', async () => {
    vi.useFakeTimers();
    let subscriberPolls = 0;
    const room = createFakeRoom({
      needsPublisher: false,
      publisherStats: directGetter, // never consulted (subscriber-only client)
      subscriberStats: async () => {
        subscriberPolls += 1;
        return subscriberPolls <= 2 ? directStats() : relayStats();
      },
    });
    const controller = createController(room);
    controller.configure(makeCredential());
    const feeder = createFeeder(controller);

    for (let i = 0; i < 7; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    // preflight probe + verification poll 1 (direct, no early-confirmation)
    expect(subscriberPolls).toBe(2);

    await vi.advanceTimersByTimeAsync(3000); // poll 2: relay evidence -> confirmed
    expect(consoleLogSpy.mock.calls.some((c) => String(c[0]).includes('relay verified'))).toBe(
      true,
    );

    const pollsAfterFinish = subscriberPolls;
    await vi.advanceTimersByTimeAsync(9000); // loop must stop after the result
    expect(subscriberPolls).toBe(pollsAfterFinish);
  });

  it('cancels in-flight verification at a lifecycle boundary so no result is ever reported', async () => {
    vi.useFakeTimers();
    let subscriberPolls = 0;
    const room = createFakeRoom({
      publisherStats: directGetter,
      subscriberStats: async () => {
        subscriberPolls += 1;
        return directStats(); // never becomes relay
      },
    });
    const controller = createController(room);
    controller.configure(makeCredential());
    const feeder = createFeeder(controller);

    for (let i = 0; i < 7; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(subscriberPolls).toBe(2); // preflight + verification poll 1

    controller.resetEvidence();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(consoleLogSpy.mock.calls.some((c) => String(c[0]).includes('relay verified'))).toBe(
      false,
    );
    expect(consoleWarnSpy.mock.calls.some((c) => String(c[0]).includes('relay not verified'))).toBe(
      false,
    );
    expect(subscriberPolls).toBe(2); // cancelled before any further poll
  });

  it('marks the session done after a completed migration even across evidence resets', async () => {
    const room = createFakeRoom({ publisherStats: directGetter, subscriberStats: directGetter });
    const controller = createController(room);
    controller.configure(makeCredential());
    const feeder = createFeeder(controller);

    for (let i = 0; i < 7; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(room.engine.pcManager!.updateConfiguration).toHaveBeenCalledTimes(1);

    // evidence reset boundaries do NOT unlock the one-attempt session budget
    controller.onConnectionEstablished();
    controller.onUnload();
    for (let i = 0; i < 10; i++) feeder.feed({ uploadQuality: 'poor', isMyConnectionPoor: true });
    await settle();
    expect(room.engine.pcManager!.updateConfiguration).toHaveBeenCalledTimes(1);
    expect(room.engine.rtcConfig?.iceTransportPolicy).toBe('relay');
  });

  it('passes the adaptation snapshot handoff through and it decides which samples close an episode', async () => {
    const POOR = { uploadQuality: 'poor', isMyConnectionPoor: true } as const;

    // FULL media: three healthy samples close the burst, so the next burst is
    // a NEW episode accelerated by the recurring path (~15s window)
    const fullRoom = createFakeRoom({
      publisherStats: directGetter,
      subscriberStats: directGetter,
    });
    const fullSnapshotSpy = vi.fn((): MediaAdaptationSnapshot => FULL_MEDIA);
    const fullController = createController(fullRoom, fullSnapshotSpy);
    fullController.configure(makeCredential());
    const fullFeeder = createFeeder(fullController);

    for (let i = 0; i < 4; i++) fullFeeder.feed(POOR); // burst 1 (t5..t20)
    for (let i = 0; i < 3; i++) fullFeeder.feed(); // FULL recovery closes it (t25..t35)
    for (let i = 0; i < 3; i++) fullFeeder.feed(POOR); // burst 2 (t40,t45,t50)
    await settle();
    expect(toast.info).not.toHaveBeenCalled(); // t50 elapsed 10s < 15s recurring window
    fullFeeder.feed(POOR); // t55: elapsed 15s -> recurring fires
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);

    // REDUCED media: identical timeline, but degraded "health" never closes
    // the burst: no prior episode exists, so the recurring acceleration never
    // applies and the slower sustained path fires one sample later.
    vi.clearAllMocks();
    const reducedRoom = createFakeRoom({
      publisherStats: directGetter,
      subscriberStats: directGetter,
    });
    const reducedSnapshotSpy = vi.fn((): MediaAdaptationSnapshot => REDUCED_MEDIA);
    const reducedController = createController(reducedRoom, reducedSnapshotSpy);
    reducedController.configure(makeCredential());
    const reducedFeeder = createFeeder(reducedController);

    for (let i = 0; i < 4; i++) reducedFeeder.feed(POOR); // same burst 1 (t5..t20)
    for (let i = 0; i < 3; i++) reducedFeeder.feed({ uploadQuality: 'good' }); // reduced "health"
    for (let i = 0; i < 5; i++) reducedFeeder.feed(POOR); // t40..t60: ratio stays <= 0.625
    await settle();
    expect(toast.info).not.toHaveBeenCalled(); // episode never closed: no recurring
    reducedFeeder.feed(POOR); // t65: ratio 0.75 >= 0.7 and elapsed 60s -> sustained
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(reducedSnapshotSpy.mock.calls.length).toBe(13);
  });
});
