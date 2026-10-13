import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VideoQuality, type Room } from 'livekit-client';

import AdaptiveMediaController from '../AdaptiveMediaController';
import { PnmConnectionQuality, type QualityStats } from '../ConnectionQualityMonitor';

/*
 * Real-class regression tests for AdaptiveMediaController: the actual
 * controller runs against a fake room/publications/store. Only the module
 * boundaries (livekit-client constants, native bridge, i18n, the Redux store
 * and its slice actions) are mocked. `document` is stubbed globally because
 * evaluate() reads document.hidden.
 *
 * Audio is never an adaptation target (no API exists to mute or unsubscribe
 * audio), so every assertion here is about video shedding / recovery.
 */

const harness = vi.hoisted(() => {
  const h = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state: undefined as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatches: [] as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notifications: [] as any[],
    subscribers: new Set<() => void>(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dispatch = (action: any) => {
    h.dispatches.push(action);

    if (action?.type === 'updateMediaDegradation') {
      h.state.roomSettings.mediaDegradation = {
        ...h.state.roomSettings.mediaDegradation,
        ...action.payload,
      };
    } else if (action?.type === 'addUserNotification') {
      h.notifications.push(action.payload);
    } else if (action?.type === 'updateRoomVideoQuality') {
      h.state.roomSettings.roomVideoQuality = action.payload;
    }

    h.subscribers.forEach((cb) => cb());
  };

  const subscribe = (cb: () => void) => {
    h.subscribers.add(cb);
    return () => {
      h.subscribers.delete(cb);
    };
  };

  return { h, dispatch, subscribe };
});

vi.mock('livekit-client', () => ({
  ConnectionState: {
    Connected: 'connected',
    Connecting: 'connecting',
    Reconnecting: 'reconnecting',
    Disconnected: 'disconnected',
  },
  RoomEvent: { TrackUnmuted: 'TrackUnmuted', TrackMuted: 'TrackMuted' },
  Track: { Source: { Camera: 'camera' } },
  VideoQuality: { LOW: 0, MEDIUM: 1, HIGH: 2 },
}));

vi.mock('plugnmeet-protocol-js', () => ({
  NativeMediaSource: { WEBCAM: 'webcam' },
}));

vi.mock('../../nativeBridge', () => ({
  isHybridMode: () => false,
  getNativePublisherStatus: () => ({ available: true }),
  muteNativeMedia: vi.fn(),
  unmuteNativeMedia: vi.fn(),
}));

vi.mock('../../i18n', () => ({
  default: { t: (key: string) => key },
}));

vi.mock('../../../store', () => ({
  store: {
    getState: () => harness.h.state,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch: (action: any) => harness.dispatch(action),
    subscribe: (cb: () => void) => harness.subscribe(cb),
  },
}));

vi.mock('../../../store/slices/roomSettingsSlice', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addUserNotification: (payload: any) => ({ type: 'addUserNotification', payload }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateMediaDegradation: (payload: any) => ({ type: 'updateMediaDegradation', payload }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateRoomVideoQuality: (payload: any) => ({ type: 'updateRoomVideoQuality', payload }),
}));

let now = 1_000_000;
let hidden = false;
const domListeners = new Map<string, (ev?: unknown) => void>();

function installDocument() {
  (globalThis as { document: unknown }).document = {
    get hidden() {
      return hidden;
    },
    get visibilityState() {
      return hidden ? 'hidden' : 'visible';
    },
    addEventListener: (type: string, listener: (ev?: unknown) => void) => {
      domListeners.set(type, listener);
    },
    removeEventListener: (type: string) => {
      domListeners.delete(type);
    },
  };
}

function makeState() {
  return {
    bottomIconsActivity: { isWebcamMuted: false, isActiveWebcam: true, isActiveScreenshare: false },
    session: {
      currentUser: { metadata: { isAdmin: true } },
      currentRoom: {
        metadata: {
          roomFeatures: { allowWebcams: true, adminOnlyWebcams: false },
          defaultLockSettings: {},
        },
      },
    },
    roomSettings: {
      mediaDegradation: {
        incomingWebcamPaused: false,
        incomingScreensharePaused: false,
        outgoingCameraPaused: false,
        autoRestoreSuspended: false,
        videoQualityReduced: false,
      },
      roomVideoQuality: VideoQuality.HIGH,
    },
  };
}

function makeRoom() {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};

  return {
    localParticipant: {
      identity: 'local-user',
      setCameraEnabled: vi.fn(async (enabled: boolean) => {
        harness.h.state.bottomIconsActivity.isWebcamMuted = !enabled;

        return true;
      }),
    },
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(cb);
    }),
    off: vi.fn(),
    emit: (event: string, ...args: unknown[]) => {
      (handlers[event] ?? []).forEach((cb) => cb(...args));
    },
  };
}

function setup(options: { enabled?: boolean; initialQuality?: VideoQuality } = {}) {
  harness.h.state = makeState();

  if (options.initialQuality !== undefined) {
    // an initial room setting the user never touched this session
    harness.h.state.roomSettings.roomVideoQuality = options.initialQuality;
  }

  harness.h.dispatches.length = 0;
  harness.h.notifications.length = 0;
  // drop subscribers left over from a previous controller instance
  harness.h.subscribers.clear();

  const room = makeRoom();
  const controller = new AdaptiveMediaController(() => room as unknown as Room, {
    enabled: options.enabled ?? true,
  });
  controller.attach();

  return { controller, room };
}

function makeStats(overrides: Partial<QualityStats> = {}): QualityStats {
  return {
    measured: true,
    rawPacketLoss: 0,
    rtt: null,
    uploadRtt: null,
    receiveRtt: null,
    uploadQuality: PnmConnectionQuality.Excellent,
    receiveQuality: PnmConnectionQuality.Excellent,
    overallQuality: PnmConnectionQuality.Excellent,
    score: 0,
    myPacketLoss: 0,
    myRtt: null,
    receivePacketLoss: 0,
    remoteReceiveStats: [],
    isLikelyDownloadIssue: false,
    isMyConnectionPoor: false,
    isReceivingPoor: false,
    isUploadAudioStuck: false,
    isUploadVideoStuck: false,
    ...overrides,
  };
}

const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

async function feed(controller: AdaptiveMediaController, overrides: Partial<QualityStats> = {}) {
  now += 5000;
  controller.evaluate(makeStats(overrides));
  await settle();
}

async function feedMany(
  controller: AdaptiveMediaController,
  count: number,
  overrides: Partial<QualityStats> = {},
) {
  for (let i = 0; i < count; i += 1) {
    await feed(controller, overrides);
  }
}

const degradation = () => harness.h.state.roomSettings.mediaDegradation;
const countUpdates = () =>
  harness.h.dispatches.filter((action) => action?.type === 'updateMediaDegradation').length;

const currentQuality = (): VideoQuality => harness.h.state.roomSettings.roomVideoQuality;

/** simulate the user picking a quality in the room-settings dropdown */
function userSetsQuality(quality: VideoQuality) {
  harness.h.state.roomSettings.roomVideoQuality = quality;
  harness.h.subscribers.forEach((cb) => cb());
}

const LOSS_BACKED_BOTH_LOST: Partial<QualityStats> = {
  uploadQuality: PnmConnectionQuality.Lost,
  receiveQuality: PnmConnectionQuality.Lost,
  myPacketLoss: 30,
  receivePacketLoss: 30,
  rawPacketLoss: 30,
};

const RTT_ONLY_BOTH_LOST: Partial<QualityStats> = {
  uploadQuality: PnmConnectionQuality.Lost,
  receiveQuality: PnmConnectionQuality.Lost,
  uploadRtt: 3000,
  receiveRtt: 3000,
  rtt: 3000,
  myPacketLoss: 0,
  receivePacketLoss: 0,
  rawPacketLoss: 0,
};

beforeEach(() => {
  now = 1_000_000;
  hidden = false;
  domListeners.clear();
  installDocument();
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AdaptiveMediaController — independent Lost streaks', () => {
  it('keeps upload Lost uplink-only and lowers quality before any receive pause', async () => {
    const { controller } = setup();

    await feed(controller, {
      uploadQuality: PnmConnectionQuality.Lost,
      myPacketLoss: 40,
      rawPacketLoss: 40,
    });
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().outgoingCameraPaused).toBe(false);

    // a single receive Lost is below the ladder threshold
    await feed(controller, {
      receiveQuality: PnmConnectionQuality.Lost,
      receivePacketLoss: 40,
      rawPacketLoss: 40,
    });
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().outgoingCameraPaused).toBe(false);

    // a second consecutive receive Lost is ordinary distress, NOT a fast path:
    // the shared quality is lowered and the controller waits
    await feed(controller, {
      receiveQuality: PnmConnectionQuality.Lost,
      receivePacketLoss: 40,
      rawPacketLoss: 40,
    });
    expect(degradation().videoQualityReduced).toBe(true);
    expect(currentQuality()).toBe(VideoQuality.LOW);
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().incomingScreensharePaused).toBe(false);

    // only FRESH receive distress may pause, and webcams are paused first
    await feed(controller, {
      receiveQuality: PnmConnectionQuality.Lost,
      receivePacketLoss: 40,
      rawPacketLoss: 40,
    });
    await feed(controller, {
      receiveQuality: PnmConnectionQuality.Lost,
      receivePacketLoss: 40,
      rawPacketLoss: 40,
    });
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().incomingScreensharePaused).toBe(false);
  });

  it('clears the Lost streaks on an unknown sample so they cannot mature across a gap', async () => {
    const { controller } = setup();

    await feed(controller, LOSS_BACKED_BOTH_LOST); // streaks 1/1, below the fast path
    await feed(controller, { measured: false }); // must clear both streaks
    await feed(controller, LOSS_BACKED_BOTH_LOST); // must stay 1/1

    // if the streak had survived the unknown sample this would be BothLost
    expect(degradation().autoRestoreSuspended).toBe(false);
    expect(controller.currentMode).not.toBe('audio-only');
  });
});

describe('AdaptiveMediaController — combined Lost policy', () => {
  it('sheds video through the normal ladder, not critical mode, for RTT-only combined Lost', async () => {
    const { controller } = setup();

    await feed(controller, RTT_ONLY_BOTH_LOST);
    await feed(controller, RTT_ONLY_BOTH_LOST);

    // the quality is lowered on the second Lost sample...
    expect(degradation().videoQualityReduced).toBe(true);
    expect(currentQuality()).toBe(VideoQuality.LOW);
    expect(degradation().incomingWebcamPaused).toBe(false);
    // ...but NOT into the persistent manual-only critical mode
    expect(degradation().autoRestoreSuspended).toBe(false);
    expect(controller.currentMode).not.toBe('audio-only');

    // fresh distress then sheds video as usual (receive webcams, then the own
    // camera through the independent uplink ladder)
    await feedMany(controller, 2, RTT_ONLY_BOTH_LOST);
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().autoRestoreSuspended).toBe(false);

    // normal staged auto-recovery restores everything (media notches, then the
    // quality LAST), proving it was never critical
    for (let round = 0; round < 5; round += 1) {
      await feedMany(controller, 4, {});
    }

    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().incomingScreensharePaused).toBe(false);
    expect(degradation().outgoingCameraPaused).toBe(false);
    expect(degradation().videoQualityReduced).toBe(false);
    expect(currentQuality()).toBe(VideoQuality.HIGH);
    expect(degradation().autoRestoreSuspended).toBe(false);
  });

  it('still enters immediate critical audio-only for loss-backed combined Lost', async () => {
    const { controller } = setup();

    await feed(controller, LOSS_BACKED_BOTH_LOST);
    await feed(controller, LOSS_BACKED_BOTH_LOST);

    expect(controller.currentMode).toBe('audio-only');
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().incomingScreensharePaused).toBe(true);
    expect(degradation().outgoingCameraPaused).toBe(true);
    expect(degradation().autoRestoreSuspended).toBe(true);
    // the verified critical bypass never spends time on the quality reduction
    expect(degradation().videoQualityReduced).toBe(false);
    expect(currentQuality()).toBe(VideoQuality.HIGH);
  });

  it('treats a NaN packet-loss reading as not loss-backed', async () => {
    const { controller } = setup();

    await feed(controller, {
      ...RTT_ONLY_BOTH_LOST,
      myPacketLoss: Number.NaN,
      receivePacketLoss: Number.NaN,
    });
    await feed(controller, {
      ...RTT_ONLY_BOTH_LOST,
      myPacketLoss: Number.NaN,
      receivePacketLoss: Number.NaN,
    });

    expect(degradation().autoRestoreSuspended).toBe(false);
    expect(controller.currentMode).not.toBe('audio-only');
  });
});

describe('AdaptiveMediaController — critical audio protection and manual restore', () => {
  it('protects audio immediately on verified upload audio-stuck and restores only on resumeAll', async () => {
    const { controller } = setup();

    await feed(controller, { isUploadAudioStuck: true });

    expect(controller.currentMode).toBe('audio-only');
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().outgoingCameraPaused).toBe(true);
    expect(degradation().autoRestoreSuspended).toBe(true);
    // audio-critical bypass: the shared quality is left untouched
    expect(degradation().videoQualityReduced).toBe(false);
    expect(currentQuality()).toBe(VideoQuality.HIGH);

    // a sustained healthy period never auto-restores critical media
    await feedMany(controller, 8, {});
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().autoRestoreSuspended).toBe(true);
    // it only exposes the manual restore opportunity
    expect(controller.canRestoreMedia).toBe(true);

    controller.resumeAll();
    await settle();

    expect(controller.canRestoreMedia).toBe(false);
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().outgoingCameraPaused).toBe(false);
    expect(degradation().autoRestoreSuspended).toBe(false);
  });

  it('lets verified audio-stuck override the manual-restore grace period', async () => {
    const { controller } = setup();

    controller.resumeAll();
    await settle();
    expect(degradation().autoRestoreSuspended).toBe(false);

    await feed(controller, { isUploadAudioStuck: true });

    expect(controller.currentMode).toBe('audio-only');
    expect(degradation().autoRestoreSuspended).toBe(true);
  });

  it('revokes a stale restore opportunity when the tab becomes visible again', async () => {
    const { controller } = setup();

    // critical audio-only protection with a matured restore opportunity
    await feed(controller, { isUploadAudioStuck: true });
    await feedMany(controller, 8, {});
    expect(controller.canRestoreMedia).toBe(true);

    // hidden-tab sampling skips evaluate() entirely, so the visibility handler
    // is the only place that can revoke the stale opportunity on return
    hidden = true;
    domListeners.get('visibilitychange')?.();
    // a not-yet-visible transition is a no-op
    expect(controller.canRestoreMedia).toBe(true);

    hidden = false;
    domListeners.get('visibilitychange')?.();
    expect(controller.canRestoreMedia).toBe(false);

    // the critical healthy streak was cleared too, so a single healthy sample
    // after the gap must not immediately re-open the opportunity
    await feed(controller, {});
    expect(controller.canRestoreMedia).toBe(false);
  });
});

describe('AdaptiveMediaController — normal staged recovery', () => {
  it('lowers quality first, then auto-restores one notch at a time ending with quality LAST', async () => {
    const { controller } = setup();

    // receive distress lowers the shared quality BEFORE anything is paused
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().videoQualityReduced).toBe(true);
    expect(currentQuality()).toBe(VideoQuality.LOW);
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().incomingScreensharePaused).toBe(false);

    // only fresh distress pauses: webcams first, then the presentation
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().incomingScreensharePaused).toBe(false);

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingScreensharePaused).toBe(true);

    await feedMany(controller, 3, { uploadQuality: PnmConnectionQuality.Poor });
    expect(degradation().outgoingCameraPaused).toBe(true);

    // recovery order stays: presentation -> webcams -> camera -> quality LAST
    await feedMany(controller, 4, {});
    expect(degradation().incomingScreensharePaused).toBe(false);
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().outgoingCameraPaused).toBe(true);
    expect(degradation().videoQualityReduced).toBe(true);

    await feedMany(controller, 4, {});
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().outgoingCameraPaused).toBe(true);
    expect(degradation().videoQualityReduced).toBe(true);

    await feedMany(controller, 4, {});
    expect(degradation().outgoingCameraPaused).toBe(false);
    // media is back but the quality is still reduced
    expect(degradation().videoQualityReduced).toBe(true);

    await feedMany(controller, 4, {});
    expect(degradation().videoQualityReduced).toBe(false);
    expect(currentQuality()).toBe(VideoQuality.HIGH);
    expect(degradation().autoRestoreSuspended).toBe(false);
  });

  it('requires consecutive MEASURED healthy samples: a gap cannot complete the streak', async () => {
    const { controller } = setup();

    // quality is lowered first, then fresh distress pauses the webcams
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(true);

    // three healthy samples leave the streak one short of NORMAL_RECOVERY_STREAK
    await feedMany(controller, 3, {});
    expect(degradation().incomingWebcamPaused).toBe(true);

    // an unknown sample proves nothing and drops the streak
    await feed(controller, { measured: false });
    expect(degradation().incomingWebcamPaused).toBe(true);

    // so one healthy sample after the gap must not complete it
    await feed(controller, {});
    expect(degradation().incomingWebcamPaused).toBe(true);

    // only four CONSECUTIVE measured healthy samples restore the notch
    await feedMany(controller, 3, {});
    expect(degradation().incomingWebcamPaused).toBe(false);
  });

  it('a hidden-tab gap cannot complete a staged restore either', async () => {
    const { controller } = setup();

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    await feedMany(controller, 3, {});
    expect(degradation().incomingWebcamPaused).toBe(true);

    hidden = true;
    await feed(controller, {});
    hidden = false;

    await feed(controller, {});
    expect(degradation().incomingWebcamPaused).toBe(true);

    await feedMany(controller, 3, {});
    expect(degradation().incomingWebcamPaused).toBe(false);
  });

  it('revokes an unclaimed restore opportunity across an evidence gap and re-earns it', async () => {
    const { controller } = setup();

    // critical audio-only protection with a matured restore opportunity
    await feed(controller, { isUploadAudioStuck: true });
    await feedMany(controller, 8, {});
    expect(controller.canRestoreMedia).toBe(true);

    // the unmeasured sample is not recovery evidence: the stale opportunity
    // must not survive it
    await feed(controller, { measured: false });
    expect(controller.canRestoreMedia).toBe(false);

    // it has to be re-earned by consecutive measured healthy samples
    await feedMany(controller, 7, {});
    expect(controller.canRestoreMedia).toBe(false);
    await feed(controller, {});
    expect(controller.canRestoreMedia).toBe(true);

    // the protective degradation and its ownership are untouched throughout
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().outgoingCameraPaused).toBe(true);
    expect(degradation().autoRestoreSuspended).toBe(true);
  });
});

describe('AdaptiveMediaController — flap guard', () => {
  it('counts one flap cycle per restore->re-degrade episode, not per pause action', async () => {
    const { controller } = setup();

    // reduce quality, then let fresh distress pause both notches
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(true);
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingScreensharePaused).toBe(true);

    // auto-restore both notches
    await feedMany(controller, 4, {});
    expect(degradation().incomingScreensharePaused).toBe(false);
    await feedMany(controller, 4, {});
    expect(degradation().incomingWebcamPaused).toBe(false);

    // ONE re-degrade episode pausing both webcams and presentation
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(true);
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingScreensharePaused).toBe(true);
    // two pause actions are still a single cycle: suspension must not fire
    expect(degradation().autoRestoreSuspended).toBe(false);

    // a second distinct restore->re-degrade cycle reaches the limit
    await feedMany(controller, 4, {});
    await feedMany(controller, 4, {});
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().autoRestoreSuspended).toBe(true);
  });
});

describe('AdaptiveMediaController — ownership, grace and reconnect', () => {
  it('hands ownership to the user on a manual camera re-enable and honors the 120s grace', async () => {
    const { controller, room } = setup();

    await feedMany(controller, 3, { uploadQuality: PnmConnectionQuality.Poor });
    expect(degradation().outgoingCameraPaused).toBe(true);

    // the user re-enables the camera themselves
    harness.h.state.bottomIconsActivity.isWebcamMuted = false;
    room.emit('TrackUnmuted', { source: 'camera' }, { identity: 'local-user' });

    expect(degradation().outgoingCameraPaused).toBe(false);

    // inside the grace window the normal ladder must not re-mute the camera
    await feedMany(controller, 3, { uploadQuality: PnmConnectionQuality.Poor });
    expect(degradation().outgoingCameraPaused).toBe(false);

    // past the grace window normal degradation resumes
    now += 130_000;
    await feed(controller, { uploadQuality: PnmConnectionQuality.Poor });
    expect(degradation().outgoingCameraPaused).toBe(true);
  });

  it('keeps Redux writes idempotent and preserves degradation across a reconnect', async () => {
    const { controller } = setup();

    // no state change -> no redundant dispatch
    controller.resumeIncomingScreenshare();
    expect(countUpdates()).toBe(0);

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().videoQualityReduced).toBe(true);
    const updates = countUpdates();
    expect(updates).toBe(1);

    // same snapshot again -> still no redundant dispatch
    controller.resumeIncomingScreenshare();
    expect(countUpdates()).toBe(updates);

    // synthetic reconnect samples must not clear the protective degradation
    await feedMany(controller, 2, { measured: false });
    expect(degradation().videoQualityReduced).toBe(true);
    expect(countUpdates()).toBe(updates);
  });

  it('preserves the degradation snapshot across dispose and re-attach', async () => {
    const { controller } = setup();

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().videoQualityReduced).toBe(true);

    const updates = countUpdates();
    controller.dispose();
    expect(countUpdates()).toBe(updates);
    expect(degradation().videoQualityReduced).toBe(true);

    controller.attach();
    await feedMany(controller, 2, { measured: false });
    expect(degradation().videoQualityReduced).toBe(true);
    expect(currentQuality()).toBe(VideoQuality.LOW);
  });
});

describe('AdaptiveMediaController — partial-evidence audio protection gate', () => {
  it('still applies the protective video-only action for an independently verified upload audio stall when the download direction is unknown', async () => {
    const { controller } = setup();

    /*
     * measured:false (the subscriber report was unusable) but the upload
     * direction's OWN evidence (uploadMeasured) verified a live mic producing
     * audio that was not sent, so audio must still be protected.
     */
    await feed(controller, {
      measured: false,
      uploadMeasured: true,
      receiveMeasured: false,
      isUploadAudioStuck: true,
    });

    expect(controller.currentMode).toBe('audio-only');
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().outgoingCameraPaused).toBe(true);
    expect(degradation().autoRestoreSuspended).toBe(true);
  });

  it('never lets an unverified upload flag on a partial or synthetic sample bypass the gate', async () => {
    const { controller } = setup();

    // a synthetic sample carries no directional validity, so its stuck flag is
    // unverified and must NOT trigger any protection
    await feed(controller, {
      measured: false,
      uploadMeasured: false,
      receiveMeasured: false,
      isUploadAudioStuck: true,
    });
    expect(controller.currentMode).not.toBe('audio-only');
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().outgoingCameraPaused).toBe(false);

    // nor may a partial sample with no directional evidence at all (undefined)
    await feed(controller, {
      measured: false,
      isUploadAudioStuck: true,
    });
    expect(controller.currentMode).not.toBe('audio-only');
    expect(degradation().incomingWebcamPaused).toBe(false);
  });

  it('a partial healthy-looking sample cannot advance recovery or dispatch UI, even with upload evidence', async () => {
    const { controller } = setup();

    // establish a normal downlink degradation (the quality is lowered)
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().videoQualityReduced).toBe(true);
    const updatesBefore = countUpdates();

    // eight partial samples with upload evidence but no stall: not global
    // health, so they may neither complete a recovery streak nor touch the UI
    await feedMany(controller, 8, {
      measured: false,
      uploadMeasured: true,
      receiveQuality: PnmConnectionQuality.Excellent,
    });

    expect(degradation().videoQualityReduced).toBe(true);
    expect(currentQuality()).toBe(VideoQuality.LOW);
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(countUpdates()).toBe(updatesBefore);

    // a fully measured healthy streak still recovers after the gate
    await feedMany(controller, 4, {});
    expect(degradation().videoQualityReduced).toBe(false);
    expect(currentQuality()).toBe(VideoQuality.HIGH);
  });

  it('preserves the fully measured audio-stuck fast path (global measured gate unchanged)', async () => {
    const { controller } = setup();

    await feed(controller, { measured: true, uploadMeasured: true, isUploadAudioStuck: true });

    expect(controller.currentMode).toBe('audio-only');
    expect(degradation().outgoingCameraPaused).toBe(true);
  });
});

describe('AdaptiveMediaController — quality before pause', () => {
  it('lowers the shared quality and waits before pausing on ordinary receive distress', async () => {
    const { controller } = setup();

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });

    expect(degradation().videoQualityReduced).toBe(true);
    expect(currentQuality()).toBe(VideoQuality.LOW);
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().incomingScreensharePaused).toBe(false);

    // the reduction consumed the evidence: fresh distress is required to pause
    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(false);

    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(true);
  });

  it('applies lower-and-wait to a receive-only Lost episode too', async () => {
    const { controller } = setup();

    // a single Lost is below the receive ladder threshold
    await feed(controller, {
      receiveQuality: PnmConnectionQuality.Lost,
      receivePacketLoss: 40,
      rawPacketLoss: 40,
    });
    expect(degradation().videoQualityReduced).toBe(false);

    // the second Lost lowers the quality instead of pausing anything
    await feed(controller, {
      receiveQuality: PnmConnectionQuality.Lost,
      receivePacketLoss: 40,
      rawPacketLoss: 40,
    });
    expect(degradation().videoQualityReduced).toBe(true);
    expect(currentQuality()).toBe(VideoQuality.LOW);
    expect(degradation().incomingWebcamPaused).toBe(false);
  });

  it('skips the ineffective reduction when the setting is already LOW', async () => {
    // an INITIAL LOW setting, not a user change (a change would grant grace and
    // suppress the immediate pause this test is about)
    const { controller } = setup({ initialQuality: VideoQuality.LOW });

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });

    expect(degradation().videoQualityReduced).toBe(false);
    expect(currentQuality()).toBe(VideoQuality.LOW);
    // a reduction would be a no-op, so the existing pause behaviour applies
    expect(degradation().incomingWebcamPaused).toBe(true);
  });

  it('never mutates the quality while adaptation is disabled', async () => {
    const { controller } = setup({ enabled: false });

    await feedMany(controller, 6, { receiveQuality: PnmConnectionQuality.Poor });

    expect(currentQuality()).toBe(VideoQuality.HIGH);
    expect(degradation().videoQualityReduced).toBe(false);
    expect(degradation().incomingWebcamPaused).toBe(false);
  });

  it('requires fresh receive evidence across an unknown gap after a reduction', async () => {
    const { controller } = setup();

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().videoQualityReduced).toBe(true);

    // poor samples rebuild receive evidence after the reduction...
    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });

    // ...but an unknown sample is not evidence: it must drop the rebuilt score
    // so pre-gap distress cannot carry the pause across the gap
    await feed(controller, { measured: false });

    // a full fresh poor sequence is required again before anything pauses
    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(false);

    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(true);
  });

  it('drops the rebuilt receive score across a hidden-tab gap after a reduction', async () => {
    const { controller } = setup();

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().videoQualityReduced).toBe(true);

    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });

    // a hidden-tab sample proves nothing either
    hidden = true;
    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    hidden = false;

    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(false);

    await feed(controller, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(true);
  });

  it('cannot complete the quality recovery streak across an unknown/hidden gap', async () => {
    const { controller } = setup();

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().videoQualityReduced).toBe(true);

    // three healthy samples leave the streak one short of the requirement
    await feedMany(controller, 3, {});
    expect(degradation().videoQualityReduced).toBe(true);

    hidden = true;
    await feed(controller, {});
    hidden = false;

    await feed(controller, {});
    expect(degradation().videoQualityReduced).toBe(true);

    await feedMany(controller, 3, {});
    expect(degradation().videoQualityReduced).toBe(false);
    expect(currentQuality()).toBe(VideoQuality.HIGH);
  });

  it('never spends a quality reduction on a verified critical bypass', async () => {
    const { controller } = setup();

    await feed(controller, LOSS_BACKED_BOTH_LOST);
    await feed(controller, LOSS_BACKED_BOTH_LOST);

    expect(controller.currentMode).toBe('audio-only');
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().videoQualityReduced).toBe(false);
    expect(currentQuality()).toBe(VideoQuality.HIGH);
  });

  it('lowers then restores an initial non-default quality (no permanent bypass)', async () => {
    // an initial MEDIUM the user never touched this session: it must still be
    // reduced and restored, not treated as an untouchable user choice
    const { controller } = setup({ initialQuality: VideoQuality.MEDIUM });

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(currentQuality()).toBe(VideoQuality.LOW);

    await feedMany(controller, 4, {});
    expect(currentQuality()).toBe(VideoQuality.MEDIUM);
    expect(degradation().videoQualityReduced).toBe(false);
  });

  it('manual resumeAll restores the quality and honors the grace window', async () => {
    const { controller } = setup();

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(currentQuality()).toBe(VideoQuality.LOW);

    controller.resumeAll();
    await settle();

    expect(currentQuality()).toBe(VideoQuality.HIGH);
    expect(degradation().videoQualityReduced).toBe(false);

    // inside the grace window the normal ladder must not lower it again
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(currentQuality()).toBe(VideoQuality.HIGH);
    expect(degradation().incomingWebcamPaused).toBe(false);

    // past the grace window normal degradation may lower it again
    now += 130_000;
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(currentQuality()).toBe(VideoQuality.LOW);
  });

  it('bounds a user quality takeover: no stale restore, then fresh episodes reduce and restore the latest choice', async () => {
    const { controller } = setup();

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(currentQuality()).toBe(VideoQuality.LOW);
    expect(degradation().videoQualityReduced).toBe(true);

    // the user takes the setting over mid-reduction: the pending reduction must
    // be relinquished so a later recovery can never restore the stale value
    userSetsQuality(VideoQuality.MEDIUM);
    expect(degradation().videoQualityReduced).toBe(false);

    // healthy samples must not restore over (or otherwise touch) their choice
    await feedMany(controller, 4, {});
    expect(currentQuality()).toBe(VideoQuality.MEDIUM);
    expect(degradation().videoQualityReduced).toBe(false);

    // the takeover grace is BOUNDED: inside it normal adaptation must not lower
    // or pause...
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(currentQuality()).toBe(VideoQuality.MEDIUM);
    expect(degradation().videoQualityReduced).toBe(false);
    expect(degradation().incomingWebcamPaused).toBe(false);

    // ...but a fresh sustained episode after the grace reduces again, saving the
    // user's latest choice rather than permanently disabling reduction
    now += 130_000;
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(currentQuality()).toBe(VideoQuality.LOW);
    expect(degradation().videoQualityReduced).toBe(true);

    // recovery restores the LATEST choice, not any stale value
    await feedMany(controller, 4, {});
    expect(currentQuality()).toBe(VideoQuality.MEDIUM);
    expect(degradation().videoQualityReduced).toBe(false);
  });

  it('tracks a cap-only reduction for the TURN snapshot and the flap guard', async () => {
    const { controller } = setup();

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    // nothing is paused, yet the coordinator must see degraded media
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(controller.getPolicySnapshot().degradedMedia).toBe(true);

    // a quality-only restore->re-degrade cycle is still a flap cycle
    await feedMany(controller, 4, {});
    expect(degradation().videoQualityReduced).toBe(false);

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().videoQualityReduced).toBe(true);
    // one cycle is not enough to suspend
    expect(degradation().autoRestoreSuspended).toBe(false);

    await feedMany(controller, 4, {});
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().videoQualityReduced).toBe(true);
    expect(degradation().autoRestoreSuspended).toBe(true);
  });
});
