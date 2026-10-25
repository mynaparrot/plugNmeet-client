import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import {
  DataMsgBodyType,
  NatsMsgClientToServerEvents,
  SessionDataType,
} from 'plugnmeet-protocol-js';
import type { SessionDataHeader } from 'plugnmeet-protocol-js';

/*
 * WhiteboardController physical-sync tests: the real controller/yjs run; only
 * NATS, the Redux store, IndexedDB and the heavy browser helpers are mocked.
 */

const { conn, state, nats } = vi.hoisted(() => ({
  conn: {
    userId: 'me',
    enableE2EE: false,
    sendWhiteboardData: vi.fn(async (..._args: unknown[]) => undefined),
    sendMessageToSystemWorker: vi.fn(),
    sendMessageToCoreWorker: vi.fn(),
    sendAnalyticsData: vi.fn(),
  },
  state: { current: {} as Record<string, unknown> },
  nats: { connected: true },
}));

vi.mock('../../../helpers/nats', () => ({
  getNatsConn: () => (nats.connected ? conn : undefined),
}));

vi.mock('../../../store', () => ({
  store: { getState: () => state.current, dispatch: vi.fn() },
}));

vi.mock('../../../store/slices/participantSlice', () => ({
  participantsSelector: { selectAll: (s: { participants: unknown[] }) => s.participants },
  selectWhiteboardParticipants: (s: { participants: { userId: string }[] }) =>
    s.participants.map((p) => ({
      userId: p.userId,
      isPresent: false,
      isWhiteboardLocked: false,
    })),
}));

vi.mock('../../../store/slices/whiteboard', () => ({
  addWhiteboardDataSentFromDonor: (input: unknown) => ({ type: 'donor', payload: input }),
}));

vi.mock('../../../helpers/utils', () => ({
  uint8ToBase64: (value: Uint8Array) => Buffer.from(value).toString('base64'),
  base64ToUint8: (value: string) => new Uint8Array(Buffer.from(value, 'base64')),
  isUserRecorder: (userId: string) => userId.startsWith('recorder'),
}));

vi.mock('../../../helpers/libs/idb', () => ({
  DB_STORE_NAMES: { WHITEBOARD: 'whiteboard' },
  idbStore: vi.fn(async () => ({})),
  idbGet: vi.fn(async () => undefined),
  idbGetAllKeys: vi.fn(async () => []),
}));

vi.mock('../../collab/whiteboardPersistence', () => ({
  listWhiteboardPages: vi.fn(async () => []),
  loadWhiteboardPageSnapshot: vi.fn(async () => undefined),
  saveWhiteboardPageSnapshot: vi.fn(async () => undefined),
}));

import { SAVE_ACK_TIMEOUT_MS, WhiteboardController } from '../collab/WhiteboardController';
import {
  SAVE_MAX_WAIT_MS,
  SessionDataSyncState,
  decompress,
} from '../../../helpers/libs/sessionDataSync';

type Peer = { userId: string; isPresenter?: boolean };
type Internals = {
  pendingSyncRequestIds: Set<string>;
  initialRequestResolver: unknown;
  missingUpdateResyncs: number;
};

const documentStub = { visibilityState: 'visible' };

const setStoreState = (participants: Peer[]) => {
  const self = participants.find((p) => p.userId === 'me');
  state.current = {
    session: {
      currentUser: {
        userId: 'me',
        name: 'Me',
        metadata: self?.isPresenter ? { isPresenter: true } : {},
      },
      currentRoom: { metadata: { defaultLockSettings: { lockWhiteboard: false } } },
    },
    participants: participants.map((p) => ({
      userId: p.userId,
      name: p.userId,
      joinedAt: 1,
      isOnline: true,
      metadata: { isPresenter: !!p.isPresenter },
    })),
    whiteboard: {
      currentPage: 1,
      currentWhiteboardOfficeFileId: 'file1',
      currentOfficeFilePages: '',
      totalPages: 1,
    },
  };
};

const makeController = () => {
  const controller = new WhiteboardController();
  controller.configure({
    excalidrawAPI: {} as never,
    roomSid: 'room-sid',
    onRemoteUpdate: () => undefined,
    canWrite: () => true,
    isPrimaryResponder: () => false,
  });
  return controller;
};

const internalsOf = (controller: WhiteboardController) => controller as unknown as Internals;

type SendCall = [DataMsgBodyType, { id?: string; message?: string; to?: string }];

const sends = (type: DataMsgBodyType) =>
  (conn.sendWhiteboardData.mock.calls as unknown as SendCall[]).filter((call) => call[0] === type);

const syncRequestSends = () => sends(DataMsgBodyType.WHITEBOARD_SYNC_REQUEST);
const sceneUpdateSends = () => sends(DataMsgBodyType.SCENE_UPDATE);

const header = (key: string) =>
  ({ dataType: SessionDataType.WHITEBOARD, key }) as SessionDataHeader;

/** Build a source doc and return its per-change updates. */
const sourceUpdates = (count: number, prefix: string) => {
  const source = new Y.Doc();
  const map = source.getMap('elements');
  const updates: Uint8Array[] = [];
  source.on('update', (update: Uint8Array) => updates.push(update));
  for (let i = 0; i < count; i++) {
    map.set(`${prefix}${i}`, '{}');
  }
  return updates;
};

let active: WhiteboardController | null = null;

const setup = (participants: Peer[]) => {
  setStoreState(participants);
  active = makeController();
  return active;
};

/* --- SESSION_DATA_SAVE ack helpers ---------------------------------------- */

type SaveCall = { event: number; msg: string; binMsg?: Uint8Array };

const saveCalls = () =>
  (conn.sendMessageToCoreWorker.mock.calls as unknown as [SaveCall][]).filter(
    ([m]) => m.event === NatsMsgClientToServerEvents.SESSION_DATA_SAVE,
  );

const saveHeaders = () => saveCalls().map(([m]) => JSON.parse(m.msg) as Record<string, string>);

const ackSave = (index: number, success = true) => {
  const header = saveHeaders()[index];
  if (!header) return;
  active!.handleSessionDataSaveResponse({
    dataType: SessionDataType.WHITEBOARD,
    key: header.key,
    requestId: header.requestId,
    success,
  } as SessionDataHeader);
};

const ackAllSaves = (success = true) => {
  saveHeaders().forEach((_, i) => ackSave(i, success));
};

const pendingUploadsOf = (controller: WhiteboardController) =>
  (controller as unknown as { pendingPageUploads: Map<string, unknown> }).pendingPageUploads;

const ackWaitersOf = (controller: WhiteboardController) =>
  (controller as unknown as { saveAckWaiters: Map<string, unknown> }).saveAckWaiters;

const checkpointedKeys = (controller: WhiteboardController) =>
  (controller as unknown as { syncStates: Map<string, SessionDataSyncState> }).syncStates.get(
    'file1_1',
  )?.hasCheckpoint ?? false;

const el = (id: string) => ({ id, version: 1, versionNonce: 1, isDeleted: false }) as never;

/** Decompress + apply the payload of save call `index` to a fresh doc; return its element map. */
const docFrom = (index: number) => {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, decompress(saveCalls()[index][0].binMsg!));
  return doc.getMap<string>('elements');
};

beforeEach(() => {
  vi.useFakeTimers();
  nats.connected = true;
  documentStub.visibilityState = 'visible';
  (globalThis as { document: unknown }).document = documentStub;
  vi.clearAllMocks();
});

afterEach(async () => {
  if (active) {
    // Teardown waits for a save ack: settle them (failure is fine) so it returns.
    const done = active.teardown();
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(SAVE_ACK_TIMEOUT_MS);
      ackAllSaves(false);
    }
    await done;
  }
  active = null;
  vi.useRealTimers();
});

describe('fetchSessionData single-flight', () => {
  it('shares one request/promise per key and drops the entry once settled', async () => {
    const controller = setup([]);

    const first = controller.fetchSessionData('file1_1');
    const second = controller.fetchSessionData('file1_1');

    expect(second).toBe(first);
    expect(conn.sendMessageToSystemWorker).toHaveBeenCalledTimes(1);
    expect(JSON.parse(conn.sendMessageToSystemWorker.mock.calls[0][0].msg).key).toBe('file1_1');

    controller.handleSessionDataResponse(header('file1_1'), new Uint8Array(0));
    await expect(first).resolves.toBe(true);

    // Settled: the next call issues a fresh request instead of reusing.
    const third = controller.fetchSessionData('file1_1');
    expect(third).not.toBe(first);
    expect(conn.sendMessageToSystemWorker).toHaveBeenCalledTimes(2);

    // Its timeout resolves only its own promise and clears the right waiter.
    await vi.advanceTimersByTimeAsync(1600);
    await expect(third).resolves.toBe(false);
    void controller.fetchSessionData('file1_1');
    expect(conn.sendMessageToSystemWorker).toHaveBeenCalledTimes(3);
  });
});

describe('unconfirmed canonical recovery', () => {
  it('retries with backoff and clears the gate on a late empty response', async () => {
    const controller = setup([{ userId: 'peer1', isPresenter: true }]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const syncing = controller.sync('file1', 1, { hydrate: true });
    await vi.advanceTimersByTimeAsync(1600); // canonical fetch #1 times out
    await vi.advanceTimersByTimeAsync(1600); // canonical fetch #2 times out
    await vi.advanceTimersByTimeAsync(1600); // diff fetch times out
    await syncing;

    expect(warn).toHaveBeenCalled();
    controller.mergeElements([
      { id: 'el1', version: 1, versionNonce: 1, isDeleted: false } as never,
    ]);

    conn.sendWhiteboardData.mockClear();
    controller.broadcastFullState();
    expect(sceneUpdateSends()).toHaveLength(0); // still gated

    // The retry timer fires and asks for the canonical key again.
    conn.sendMessageToSystemWorker.mockClear();
    for (let i = 0; i < 40 && conn.sendMessageToSystemWorker.mock.calls.length === 0; i++) {
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(conn.sendMessageToSystemWorker).toHaveBeenCalledTimes(1);
    expect(JSON.parse(conn.sendMessageToSystemWorker.mock.calls[0][0].msg).key).toBe('file1_1');

    // Late EMPTY canonical: nothing applied, but the key is confirmed.
    conn.sendWhiteboardData.mockClear();
    controller.handleSessionDataResponse(header('file1_1'), new Uint8Array(0));
    await vi.advanceTimersByTimeAsync(1);

    // The retry path itself saved + broadcast once the key was confirmed.
    expect(sceneUpdateSends()).toHaveLength(1);

    // No further retries once confirmed.
    conn.sendMessageToSystemWorker.mockClear();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(conn.sendMessageToSystemWorker).not.toHaveBeenCalled();

    warn.mockRestore();
  });
});

describe('missing-update detection', () => {
  it('requests a resync when an update arrives with missing dependencies, throttled', async () => {
    const controller = setup([{ userId: 'peer1', isPresenter: true }, { userId: 'peer2' }]);
    await controller.sync('file1', 1, { hydrate: false });

    const doc = controller.getSnapshot()!.doc;
    const updates = sourceUpdates(3, 'e');

    conn.sendWhiteboardData.mockClear();
    controller.applyRemoteUpdate(updates[1]); // missing the first struct

    expect(doc.store.pendingStructs).not.toBeNull();
    expect(syncRequestSends().map((call) => call[1].to)).toEqual(['peer1', 'peer2']);

    // Second gap inside the throttle window: no extra request.
    conn.sendWhiteboardData.mockClear();
    controller.applyRemoteUpdate(updates[2]);
    expect(syncRequestSends()).toHaveLength(0);

    // A different peer's gap after the window fires again.
    await vi.advanceTimersByTimeAsync(2100);
    conn.sendWhiteboardData.mockClear();
    controller.applyRemoteUpdate(sourceUpdates(2, 'other')[1]);
    expect(syncRequestSends().length).toBeGreaterThan(0);
  });

  it('stays silent while the initial handshake is pending and keeps its throttle budget', async () => {
    const controller = setup([{ userId: 'peer1', isPresenter: true }]);
    await controller.sync('file1', 1, { hydrate: false });

    const internals = internalsOf(controller);
    internals.initialRequestResolver = () => undefined;

    conn.sendWhiteboardData.mockClear();
    controller.applyRemoteUpdate(sourceUpdates(3, 'p')[1]); // missing the first struct
    expect(controller.getSnapshot()!.doc.store.pendingStructs).not.toBeNull();
    expect(syncRequestSends()).toHaveLength(0);
    expect(internals.missingUpdateResyncs).toBe(0); // throttle/counter not consumed

    // Handshake over: the same gap now triggers a request instead of being throttled.
    internals.initialRequestResolver = null;
    conn.sendWhiteboardData.mockClear();
    controller.applyRemoteUpdate(sourceUpdates(2, 'q')[1]);
    expect(syncRequestSends().length).toBeGreaterThan(0);
  });
});

describe('periodic anti-entropy', () => {
  const answerHandshake = (controller: WhiteboardController) => {
    for (const call of syncRequestSends()) {
      controller.handleMessage(
        DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE,
        new Uint8Array([0, 0]),
        'peer1',
        call[1].id as string,
        JSON.stringify({ fileId: 'file1', page: 1 }),
      );
    }
  };

  it('skips while a sync is in flight / page hidden, then asks only one peer', async () => {
    const controller = setup([{ userId: 'peer1', isPresenter: true }, { userId: 'peer2' }]);
    await controller.sync('file1', 1, { hydrate: false });
    answerHandshake(controller);
    await vi.advanceTimersByTimeAsync(1);
    expect(internalsOf(controller).pendingSyncRequestIds.size).toBe(0);

    // In flight: nothing new is sent.
    internalsOf(controller).pendingSyncRequestIds.add('in-flight');
    conn.sendWhiteboardData.mockClear();
    await vi.advanceTimersByTimeAsync(31_000);
    expect(syncRequestSends()).toHaveLength(0);

    // Hidden tab: nothing is sent.
    internalsOf(controller).pendingSyncRequestIds.clear();
    documentStub.visibilityState = 'hidden';
    conn.sendWhiteboardData.mockClear();
    await vi.advanceTimersByTimeAsync(31_000);
    expect(syncRequestSends()).toHaveLength(0);

    // Visible + idle: a single state-vector request to the presenter-first peer.
    documentStub.visibilityState = 'visible';
    conn.sendWhiteboardData.mockClear();
    for (let i = 0; i < 320 && syncRequestSends().length === 0; i++) {
      await vi.advanceTimersByTimeAsync(100);
    }
    const requests = syncRequestSends();
    expect(requests).toHaveLength(1);
    expect(requests[0][1].to).toBe('peer1');
  });
});

describe('SESSION_DATA save ack', () => {
  /** Presenter on an empty page 1, ready to save. */
  const presenterOnPage = async () => {
    const controller = setup([{ userId: 'me', isPresenter: true }]);
    await controller.sync('file1', 1, { hydrate: false });
    return controller;
  };

  /** Advance fake time in slices until `promise` settles (upload acks never arrive). */
  const runUntilSettled = async (promise: Promise<unknown>, step = 1600, maxSteps = 60) => {
    let settled = false;
    void promise.then(
      () => (settled = true),
      () => (settled = true),
    );
    for (let i = 0; i < maxSteps; i++) {
      if (settled) break;
      await vi.advanceTimersByTimeAsync(step);
    }
    return promise;
  };

  it('baselines a checkpoint at plan time, so edits during the ack go into the next diff', async () => {
    const controller = await presenterOnPage();

    controller.mergeElements([el('el1')]);
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);
    expect(saveHeaders()).toHaveLength(1);
    expect(saveHeaders()[0].key).toBe('file1_1');
    expect(saveHeaders()[0].requestId).toBeTruthy();

    // Edit while the checkpoint is still unacked: it must not enter this diff.
    controller.mergeElements([el('el2')]);
    ackSave(0, true);
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);

    expect(saveHeaders()).toHaveLength(2);
    expect(saveHeaders()[1].key).toBe('file1_1~d');
    // The checkpoint holds only el1; the diff adds el2 on top of it.
    expect(Array.from(docFrom(0).keys())).toEqual(['el1']);
    const base = new Y.Doc();
    Y.applyUpdate(base, decompress(saveCalls()[0][0].binMsg!));
    Y.applyUpdate(base, decompress(saveCalls()[1][0].binMsg!));
    expect(Array.from(base.getMap<string>('elements').keys()).sort()).toEqual(['el1', 'el2']);
  });

  it('serializes saves: the next plan waits for the previous ack', async () => {
    const controller = await presenterOnPage();

    controller.mergeElements([el('el1')]);
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);
    expect(saveHeaders()).toHaveLength(1);

    // A second (scheduled) save falls due while the first is still unacked.
    controller.mergeElements([el('el2')]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(saveHeaders()).toHaveLength(1);

    ackSave(0, true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(saveHeaders()).toHaveLength(2);
    // Planned after the ack, so it is a diff carrying the coalesced edit.
    expect(saveHeaders()[1].key).toBe('file1_1~d');
    const base = new Y.Doc();
    Y.applyUpdate(base, decompress(saveCalls()[0][0].binMsg!));
    Y.applyUpdate(base, decompress(saveCalls()[1][0].binMsg!));
    expect(Array.from(base.getMap<string>('elements').keys()).sort()).toEqual(['el1', 'el2']);
  });

  it('keeps the baseline when the ack times out, so the retry is a checkpoint again', async () => {
    const controller = await presenterOnPage();

    controller.mergeElements([el('el1')]);
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);
    expect(saveHeaders()[0].key).toBe('file1_1');

    // No ack: the waiter times out and a backoff retry is armed.
    await vi.advanceTimersByTimeAsync(SAVE_ACK_TIMEOUT_MS);
    expect(checkpointedKeys(controller)).toBe(false);
    await vi.advanceTimersByTimeAsync(2000);

    expect(saveHeaders()).toHaveLength(2);
    expect(saveHeaders()[1].key).toBe('file1_1');

    ackSave(1, true);
    await vi.advanceTimersByTimeAsync(1);
    expect(checkpointedKeys(controller)).toBe(true);
  });

  it('sends the full state to the ~d key while the canonical is unconfirmed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const controller = setup([{ userId: 'me', isPresenter: true }]);
    const syncing = controller.sync('file1', 1, { hydrate: true });
    await vi.advanceTimersByTimeAsync(1600);
    await vi.advanceTimersByTimeAsync(1600);
    await vi.advanceTimersByTimeAsync(1600);
    await syncing;

    controller.mergeElements([el('el1')]);
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);

    expect(saveHeaders()[0].key).toBe('file1_1~d');
    // The whole doc, not a diff.
    expect(Array.from(docFrom(0).keys())).toEqual(['el1']);
    ackSave(0, true);
    await vi.advanceTimersByTimeAsync(1);
    // Baseline untouched: the server never confirmed a canonical for this page.
    expect(checkpointedKeys(controller)).toBe(false);
    warn.mockRestore();
  });

  it('stashes unconfirmed content on flush failure and merges it when the page is rehydrated', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const controller = await presenterOnPage();
    controller.mergeElements([el('el1')]);

    const flushed = controller.flushBeforeSwitch();
    await vi.advanceTimersByTimeAsync(7000); // 2 × ack timeout + retry pause ≥ SAVE_FLUSH_TIMEOUT
    await expect(flushed).resolves.toBe(false);
    expect(pendingUploadsOf(controller).has('file1_1')).toBe(true);

    // Switch away: the teardown save stays unacked, so page 1 stays stashed.
    await runUntilSettled(controller.sync('file1', 2, { hydrate: false }));
    expect(pendingUploadsOf(controller).has('file1_1')).toBe(true);

    // Switch back: hydration applies the stashed state and clears the entry.
    await runUntilSettled(controller.sync('file1', 1, { hydrate: true }));
    expect(pendingUploadsOf(controller).has('file1_1')).toBe(false);
    expect(controller.getSnapshot()!.doc.getMap<string>('elements').get('el1')).toBeTruthy();
    // The rehydrated doc starts from a fresh baseline → a full checkpoint.
    expect(checkpointedKeys(controller)).toBe(false);
    warn.mockRestore();
  });

  it('clears a stashed upload once a background retry is acked', async () => {
    const controller = await presenterOnPage();
    controller.mergeElements([el('el1')]);

    const flushed = controller.flushBeforeSwitch();
    await vi.advanceTimersByTimeAsync(7000);
    await expect(flushed).resolves.toBe(false);
    expect(pendingUploadsOf(controller).has('file1_1')).toBe(true);

    conn.sendMessageToCoreWorker.mockClear();
    for (let i = 0; i < 40 && saveHeaders().length === 0; i++) {
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(saveHeaders()[0].key).toBe('file1_1');
    ackSave(0, true);
    await vi.advanceTimersByTimeAsync(1);

    expect(pendingUploadsOf(controller).has('file1_1')).toBe(false);
    expect(checkpointedKeys(controller)).toBe(true);
  });

  it('treats a success=false ack as a failure and keeps the baseline', async () => {
    const controller = await presenterOnPage();
    controller.mergeElements([el('el1')]);
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);
    expect(saveHeaders()[0].key).toBe('file1_1');

    // The server rejects the save: no baseline, and a retry is armed.
    ackSave(0, false);
    await vi.advanceTimersByTimeAsync(1);
    expect(checkpointedKeys(controller)).toBe(false);

    await vi.advanceTimersByTimeAsync(2000);
    expect(saveHeaders()).toHaveLength(2);
    expect(saveHeaders()[1].key).toBe('file1_1');
  });

  it('flushBeforeSwitch resolves only once the ack arrives, keeping nothing stashed', async () => {
    const controller = await presenterOnPage();
    controller.mergeElements([el('el1')]);

    let settled = false;
    const flushed = controller.flushBeforeSwitch().then((ok) => {
      settled = true;
      return ok;
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(saveHeaders()).toHaveLength(1);
    expect(settled).toBe(false);

    ackSave(0, true);
    await expect(flushed).resolves.toBe(true);
    expect(pendingUploadsOf(controller).size).toBe(0);
    // Acked on the first attempt: no extra round trips.
    expect(saveHeaders()).toHaveLength(1);
  });

  it('paces flush retries when every save fails without waiting for an ack', async () => {
    const controller = await presenterOnPage();
    controller.mergeElements([el('el1')]);
    const uploads = vi.spyOn(controller, 'uploadSessionData');

    // No NATS connection: uploadSessionData fails instantly, so an unpaced
    // retry loop would spin on microtasks until the flush deadline.
    nats.connected = false;
    const flushed = controller.flushBeforeSwitch();
    await vi.advanceTimersByTimeAsync(6000); // > SAVE_FLUSH_TIMEOUT

    await expect(flushed).resolves.toBe(false);
    // ~SAVE_FLUSH_TIMEOUT / retry delay, not thousands of attempts.
    expect(uploads.mock.calls.length).toBeGreaterThan(1);
    expect(uploads.mock.calls.length).toBeLessThanOrEqual(20);
    expect(pendingUploadsOf(controller).has('file1_1')).toBe(true);
    uploads.mockRestore();
  });

  it('does not upload an empty page', async () => {
    const controller = await presenterOnPage();
    await expect(controller.flushBeforeSwitch()).resolves.toBe(true);
    expect(saveHeaders()).toHaveLength(0);
    expect(pendingUploadsOf(controller).size).toBe(0);
  });

  it('settles save waiters with false and clears them on destroy', async () => {
    const controller = await presenterOnPage();
    const pending = controller.uploadSessionData(new Uint8Array([1]), 'file1_1');
    expect(ackWaitersOf(controller).size).toBe(1);

    const destroyed = controller.destroy();
    await vi.advanceTimersByTimeAsync(1);
    await destroyed;

    await expect(pending).resolves.toBe(false);
    expect(ackWaitersOf(controller).size).toBe(0);
  });
});
