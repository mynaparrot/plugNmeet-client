import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Room } from 'livekit-client';

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
    }
  };

  return { h, dispatch };
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
  },
}));

vi.mock('../../../store/slices/roomSettingsSlice', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addUserNotification: (payload: any) => ({ type: 'addUserNotification', payload }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateMediaDegradation: (payload: any) => ({ type: 'updateMediaDegradation', payload }),
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
      },
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

function setup(options: { enabled?: boolean } = {}) {
  harness.h.state = makeState();
  harness.h.dispatches.length = 0;
  harness.h.notifications.length = 0;

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
  it('never lets an upload Lost mature the receive Lost fast path', async () => {
    const { controller } = setup();

    await feed(controller, {
      uploadQuality: PnmConnectionQuality.Lost,
      myPacketLoss: 40,
      rawPacketLoss: 40,
    });
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().outgoingCameraPaused).toBe(false);

    // a single receive Lost: the removed shared streak would already fire here
    await feed(controller, {
      receiveQuality: PnmConnectionQuality.Lost,
      receivePacketLoss: 40,
      rawPacketLoss: 40,
    });
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().outgoingCameraPaused).toBe(false);

    // a second consecutive receive Lost legitimately fires the fast path
    await feed(controller, {
      receiveQuality: PnmConnectionQuality.Lost,
      receivePacketLoss: 40,
      rawPacketLoss: 40,
    });
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().incomingScreensharePaused).toBe(true);
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

    // the video was shed on the second Lost sample...
    expect(degradation().incomingWebcamPaused).toBe(true);
    // ...but NOT into the persistent manual-only critical mode
    expect(degradation().autoRestoreSuspended).toBe(false);
    expect(controller.currentMode).not.toBe('audio-only');

    await feedMany(controller, 4, {});

    // normal staged auto-recovery works, proving it was never critical
    expect(degradation().incomingWebcamPaused).toBe(false);
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
  it('auto-restores one notch at a time: presentation, then webcams, then camera', async () => {
    const { controller } = setup();

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().incomingScreensharePaused).toBe(false);

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingScreensharePaused).toBe(true);

    await feedMany(controller, 3, { uploadQuality: PnmConnectionQuality.Poor });
    expect(degradation().outgoingCameraPaused).toBe(true);

    await feedMany(controller, 4, {});
    expect(degradation().incomingScreensharePaused).toBe(false);
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().outgoingCameraPaused).toBe(true);

    await feedMany(controller, 4, {});
    expect(degradation().incomingWebcamPaused).toBe(false);
    expect(degradation().outgoingCameraPaused).toBe(true);

    await feedMany(controller, 4, {});
    expect(degradation().outgoingCameraPaused).toBe(false);
    expect(degradation().autoRestoreSuspended).toBe(false);
  });

  it('requires consecutive MEASURED healthy samples: a gap cannot complete the streak', async () => {
    const { controller } = setup();

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
    expect(degradation().incomingWebcamPaused).toBe(true);
    const updates = countUpdates();
    expect(updates).toBe(1);

    // same snapshot again -> still no redundant dispatch
    controller.resumeIncomingScreenshare();
    expect(countUpdates()).toBe(updates);

    // synthetic reconnect samples must not clear the protective degradation
    await feedMany(controller, 2, { measured: false });
    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(countUpdates()).toBe(updates);
  });

  it('preserves the degradation snapshot across dispose and re-attach', async () => {
    const { controller } = setup();

    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(true);

    const updates = countUpdates();
    controller.dispose();
    expect(countUpdates()).toBe(updates);
    expect(degradation().incomingWebcamPaused).toBe(true);

    controller.attach();
    await feedMany(controller, 2, { measured: false });
    expect(degradation().incomingWebcamPaused).toBe(true);
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

    // establish a normal downlink degradation
    await feedMany(controller, 3, { receiveQuality: PnmConnectionQuality.Poor });
    expect(degradation().incomingWebcamPaused).toBe(true);
    const updatesBefore = countUpdates();

    // eight partial samples with upload evidence but no stall: not global
    // health, so they may neither complete a recovery streak nor touch the UI
    await feedMany(controller, 8, {
      measured: false,
      uploadMeasured: true,
      receiveQuality: PnmConnectionQuality.Excellent,
    });

    expect(degradation().incomingWebcamPaused).toBe(true);
    expect(degradation().incomingScreensharePaused).toBe(false);
    expect(countUpdates()).toBe(updatesBefore);

    // a fully measured healthy streak still recovers after the gate
    await feedMany(controller, 4, {});
    expect(degradation().incomingWebcamPaused).toBe(false);
  });

  it('preserves the fully measured audio-stuck fast path (global measured gate unchanged)', async () => {
    const { controller } = setup();

    await feed(controller, { measured: true, uploadMeasured: true, isUploadAudioStuck: true });

    expect(controller.currentMode).toBe('audio-only');
    expect(degradation().outgoingCameraPaused).toBe(true);
  });
});
