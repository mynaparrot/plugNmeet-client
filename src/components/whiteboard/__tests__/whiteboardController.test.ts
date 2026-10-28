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
  setWhiteboardCurrentPage: (payload: number) => ({ type: 'page-change', payload }),
  updateCurrentWhiteboardOfficeFileId: (payload: { fileId: string; page: number }) => ({
    type: 'file-change',
    payload,
  }),
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
  idbDel: vi.fn(async () => undefined),
}));

vi.mock('../collab/whiteboardPersistence', () => ({
  listWhiteboardPages: vi.fn(async () => []),
  loadWhiteboardPageSnapshot: vi.fn(async () => undefined),
  saveWhiteboardPageSnapshot: vi.fn(async () => undefined),
}));

import { store } from '../../../store';
import {
  INITIAL_REQUEST_RETRY_MS,
  SAVE_ACK_TIMEOUT_MS,
  WhiteboardController,
} from '../collab/WhiteboardController';
import { loadWhiteboardPageSnapshot } from '../collab/whiteboardPersistence';
import {
  SAVE_MAX_WAIT_MS,
  SessionDataSyncState,
  decompress,
} from '../../../helpers/libs/sessionDataSync';

type Peer = { userId: string; isPresenter?: boolean; isOnline?: boolean };
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
      isOnline: p.isOnline ?? true,
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
    excalidrawAPI: {
      getAppState: () => ({
        height: 600,
        width: 800,
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 },
        theme: 'light',
        viewBackgroundColor: '#ffffff',
        zenModeEnabled: false,
        gridSize: null,
      }),
    } as never,
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
const pageChangeSends = () => sends(DataMsgBodyType.PAGE_CHANGE);
const fileChangeSends = () => sends(DataMsgBodyType.FILE_CHANGE);

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

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
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
  // The real reducer moves the store to the donor scope; mirror that so the
  // serialized donor setup sees the scope it dispatched.
  vi.mocked(store.dispatch).mockImplementation(((action: {
    type?: string;
    payload?: Record<string, unknown>;
  }) => {
    if (action?.type === 'donor' && action.payload) {
      const whiteboard = (state.current as { whiteboard: Record<string, unknown> }).whiteboard;
      whiteboard.currentWhiteboardOfficeFileId = action.payload.currentWhiteboardOfficeFileId;
      whiteboard.currentPage = action.payload.currentPageNumber;
      whiteboard.currentOfficeFilePages = action.payload.currentOfficeFilePages;
    }
    return action;
  }) as never);
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

describe('serialized doc lifecycle', () => {
  it('runs the next sync after a rejected one', async () => {
    const controller = setup([]);
    const order: string[] = [];
    const doSync = vi
      .spyOn(
        controller as unknown as {
          doSync: (fileId: string, page: number, hydrate: boolean) => Promise<void>;
        },
        'doSync',
      )
      .mockImplementationOnce(async () => {
        order.push('first');
        throw new Error('hydration failed');
      })
      .mockImplementation(async () => {
        order.push('second');
      });

    await expect(controller.sync('file1', 1)).rejects.toThrow('hydration failed');
    await expect(controller.sync('file1', 2)).resolves.toBeUndefined();

    expect(order).toEqual(['first', 'second']);
    expect(doSync).toHaveBeenCalledTimes(2);
  });
});

describe('initial bootstrap ownership', () => {
  const donorInitialData = (page: number) => ({
    currentPageNumber: page,
    currentWhiteboardOfficeFileId: 'donor-file',
    currentOfficeFilePages: '',
    appState: {
      height: 100,
      width: 100,
      scrollX: 0,
      scrollY: 0,
      zoomValue: 1,
      theme: 'light',
      viewBackgroundColor: '#fff',
      zenModeEnabled: false,
      gridSize: null,
    },
  });

  const deliverInitialData = (
    controller: WhiteboardController,
    requestId: string,
    page: number,
    binMessage = sourceUpdates(1, 'boot')[0],
  ) =>
    controller.handleMessage(
      DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE,
      binMessage,
      'peer1',
      requestId,
      JSON.stringify({
        fileId: 'donor-file',
        page,
        initial_data: JSON.stringify(donorInitialData(page)),
      }),
    );

  it('ignores a donor bootstrap that answers after a newer presenter scope', async () => {
    const controller = setup([{ userId: 'me' }, { userId: 'peer1', isPresenter: true }]);
    const initial = controller.requestInitialData();
    const requestId = Array.from(internalsOf(controller).pendingSyncRequestIds)[0];

    // Presenter moved to page 2 while the bootstrap request was in flight.
    const storeState = state.current as { whiteboard: { currentPage: number } };
    storeState.whiteboard.currentPage = 2;

    deliverInitialData(controller, requestId, 1);
    await vi.advanceTimersByTimeAsync(0);

    await expect(initial).resolves.toEqual({ fileId: 'file1', page: 2 });
    expect(vi.mocked(store.dispatch)).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toBeNull();
  });

  it('retries the bootstrap request after 500ms and resolves from the retry answer', async () => {
    const controller = setup([{ userId: 'me' }, { userId: 'peer1', isPresenter: true }]);
    const initial = controller.requestInitialData();
    const firstId = Array.from(internalsOf(controller).pendingSyncRequestIds)[0];
    expect(syncRequestSends()).toHaveLength(1);

    // The presenter is still hydrating: the first request stays unanswered.
    await vi.advanceTimersByTimeAsync(INITIAL_REQUEST_RETRY_MS - 100);
    expect(syncRequestSends()).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(100);
    const retryId = Array.from(internalsOf(controller).pendingSyncRequestIds).find(
      (id) => id !== firstId,
    );
    expect(syncRequestSends()).toHaveLength(2);
    expect(retryId).toBeDefined();

    // Answering the retry resolves long before the 4s timeout.
    deliverInitialData(controller, retryId!, 3);
    await vi.advanceTimersByTimeAsync(0);

    await expect(initial).resolves.toEqual({ fileId: 'donor-file', page: 3 });
    expect(internalsOf(controller).pendingSyncRequestIds.size).toBe(0);

    // Request timeout and retry loop are gone with the resolved bootstrap.
    await vi.advanceTimersByTimeAsync(INITIAL_REQUEST_RETRY_MS * 10);
    expect(syncRequestSends()).toHaveLength(2);
  });

  it('still accepts a late answer to an earlier request id after a retry', async () => {
    const controller = setup([{ userId: 'me' }, { userId: 'peer1', isPresenter: true }]);
    const initial = controller.requestInitialData();
    const firstId = Array.from(internalsOf(controller).pendingSyncRequestIds)[0];

    await vi.advanceTimersByTimeAsync(INITIAL_REQUEST_RETRY_MS);
    expect(syncRequestSends()).toHaveLength(2);
    expect(internalsOf(controller).pendingSyncRequestIds.has(firstId)).toBe(true);

    deliverInitialData(controller, firstId, 2);
    await vi.advanceTimersByTimeAsync(0);

    await expect(initial).resolves.toEqual({ fileId: 'donor-file', page: 2 });
    expect(internalsOf(controller).pendingSyncRequestIds.size).toBe(0);
  });

  it('still bootstraps from the donor when nothing newer was authorized', async () => {
    const controller = setup([{ userId: 'me' }, { userId: 'peer1', isPresenter: true }]);
    const initial = controller.requestInitialData();
    const requestId = Array.from(internalsOf(controller).pendingSyncRequestIds)[0];

    deliverInitialData(controller, requestId, 3);
    await vi.advanceTimersByTimeAsync(0);

    await expect(initial).resolves.toEqual({ fileId: 'donor-file', page: 3 });
    expect(vi.mocked(store.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'donor' }),
    );
    expect(controller.getSnapshot()?.page).toBe(3);
  });

  it('drops the donor setup when a newer scope wins while it waits for the doc lifecycle', async () => {
    const controller = setup([{ userId: 'me' }, { userId: 'peer1', isPresenter: true }]);
    const gate = deferred();
    vi.spyOn(
      controller as unknown as {
        doSync: (fileId: string, page: number, hydrate: boolean) => Promise<void>;
      },
      'doSync',
    ).mockImplementation(async () => {
      await gate.promise;
    });

    // A page/file switch already occupies the serialized doc lifecycle.
    const switching = controller.sync('file1', 1);
    const initial = controller.requestInitialData();
    const requestId = Array.from(internalsOf(controller).pendingSyncRequestIds)[0];
    deliverInitialData(controller, requestId, 3);
    await vi.advanceTimersByTimeAsync(0); // the donor setup waits in the chain

    // A newer presenter scope arrives before the donor setup can run.
    const storeState = state.current as {
      whiteboard: { currentWhiteboardOfficeFileId: string; currentPage: number };
    };
    storeState.whiteboard.currentWhiteboardOfficeFileId = 'file2';
    storeState.whiteboard.currentPage = 4;

    gate.resolve();
    await switching;
    await vi.advanceTimersByTimeAsync(0);

    await expect(initial).resolves.toEqual({ fileId: 'file2', page: 4 });
    expect(controller.getSnapshot()).toBeNull();
  });
});

describe('presenter scope self-healing', () => {
  const scope = (fileId: string, page: number) => JSON.stringify({ fileId, page });
  const update = (prefix: string) => sourceUpdates(1, prefix)[0];
  const emptyStateVector = new Uint8Array([0, 0]);

  const presenterOn = async (fileId: string, page: number, peers: Peer[] = []) => {
    const controller = setup([{ userId: 'me', isPresenter: true }, ...peers]);
    const whiteboard = (
      state.current as {
        whiteboard: { currentWhiteboardOfficeFileId: string; currentPage: number };
      }
    ).whiteboard;
    whiteboard.currentWhiteboardOfficeFileId = fileId;
    whiteboard.currentPage = page;
    await controller.sync(fileId, page, { hydrate: false });
    conn.sendWhiteboardData.mockClear();
    return controller;
  };

  const followerOn = async (fileId: string, page: number) => {
    const controller = setup([
      { userId: 'me' },
      { userId: 'peer1', isPresenter: true },
      { userId: 'peer2' },
    ]);
    await controller.sync(fileId, page, { hydrate: false });
    conn.sendWhiteboardData.mockClear();
    return controller;
  };

  describe('follower adopts the presenter scope from a stale SCENE_UPDATE', () => {
    it('adopts a different page', async () => {
      const controller = await followerOn('file1', 1);
      vi.mocked(store.dispatch).mockClear();

      controller.handleMessage(
        DataMsgBodyType.SCENE_UPDATE,
        update('adopt-page'),
        'peer1',
        undefined,
        scope('file1', 3),
      );

      expect(store.dispatch).toHaveBeenCalledWith({ type: 'page-change', payload: 3 });
      // The Redux watcher owns the navigation/sync, not the controller.
      expect(controller.getSnapshot()!.page).toBe(1);
    });

    it('adopts a different file', async () => {
      const controller = await followerOn('file1', 1);
      vi.mocked(store.dispatch).mockClear();

      controller.handleMessage(
        DataMsgBodyType.SCENE_UPDATE,
        update('adopt-file'),
        'peer1',
        undefined,
        scope('file2', 4),
      );

      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'file-change',
        payload: { fileId: 'file2', page: 4 },
      });
    });

    it('ignores scopes from non-presenters and offline presenters', async () => {
      const controller = await followerOn('file1', 1);
      vi.mocked(store.dispatch).mockClear();

      controller.handleMessage(
        DataMsgBodyType.SCENE_UPDATE,
        update('non-presenter'),
        'peer2',
        undefined,
        scope('file2', 2),
      );
      expect(store.dispatch).not.toHaveBeenCalled();

      const participant = (
        state.current as { participants: { userId: string; isOnline: boolean }[] }
      ).participants.find((p) => p.userId === 'peer1')!;
      participant.isOnline = false;
      controller.handleMessage(
        DataMsgBodyType.SCENE_UPDATE,
        update('offline-presenter'),
        'peer1',
        undefined,
        scope('file2', 2),
      );
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('presenter nudges stale peers', () => {
    it('sends a targeted PAGE_CHANGE for a stale SCENE_UPDATE', async () => {
      const controller = await presenterOn('file1', 1, [{ userId: 'peer1' }]);

      controller.handleMessage(
        DataMsgBodyType.SCENE_UPDATE,
        update('stale-page'),
        'peer1',
        undefined,
        scope('file1', 2),
      );

      expect(pageChangeSends()).toEqual([
        [DataMsgBodyType.PAGE_CHANGE, { message: '1', to: 'peer1' }],
      ]);
      // The stale update is not applied to the live doc.
      expect(controller.getElements()).toHaveLength(0);
    });

    it('sends a targeted FILE_CHANGE for a stale file', async () => {
      const controller = await presenterOn('file1', 2, [{ userId: 'peer1' }]);

      controller.handleMessage(
        DataMsgBodyType.SCENE_UPDATE,
        update('stale-file'),
        'peer1',
        undefined,
        scope('file2', 1),
      );

      expect(fileChangeSends()).toEqual([
        [
          DataMsgBodyType.FILE_CHANGE,
          { message: JSON.stringify({ fileId: 'file1', page: 2 }), to: 'peer1' },
        ],
      ]);
      expect(pageChangeSends()).toHaveLength(0);
    });

    it('throttles nudges per peer', async () => {
      const controller = await presenterOn('file1', 1, [{ userId: 'peer1' }, { userId: 'peer2' }]);

      controller.handleMessage(
        DataMsgBodyType.SCENE_UPDATE,
        update('throttle-1'),
        'peer1',
        undefined,
        scope('file1', 2),
      );
      controller.handleMessage(
        DataMsgBodyType.SCENE_UPDATE,
        update('throttle-2'),
        'peer1',
        undefined,
        scope('file1', 3),
      );
      expect(pageChangeSends()).toHaveLength(1);

      controller.handleMessage(
        DataMsgBodyType.SCENE_UPDATE,
        update('throttle-3'),
        'peer2',
        undefined,
        scope('file1', 2),
      );
      expect(pageChangeSends()).toHaveLength(2);

      await vi.advanceTimersByTimeAsync(2100);
      conn.sendWhiteboardData.mockClear();
      controller.handleMessage(
        DataMsgBodyType.SCENE_UPDATE,
        update('throttle-4'),
        'peer1',
        undefined,
        scope('file1', 2),
      );
      expect(pageChangeSends()).toHaveLength(1);
    });

    it('does not pull back a peer that is ahead while this doc is still switching', async () => {
      const controller = await presenterOn('file1', 1, [{ userId: 'peer1' }]);
      (state.current as { whiteboard: { currentPage: number } }).whiteboard.currentPage = 2;

      controller.handleMessage(
        DataMsgBodyType.SCENE_UPDATE,
        update('ahead'),
        'peer1',
        undefined,
        scope('file1', 2),
      );

      expect(pageChangeSends()).toHaveLength(0);
      expect(fileChangeSends()).toHaveLength(0);
    });
  });

  describe('sync requests', () => {
    it('redirects a stale peer instead of serving a snapshot', async () => {
      const controller = await presenterOn('file1', 2, [{ userId: 'peer1' }]);

      controller.handleMessage(
        DataMsgBodyType.WHITEBOARD_SYNC_REQUEST,
        emptyStateVector,
        'peer1',
        'req-stale-page',
        scope('file1', 1),
      );
      await vi.advanceTimersByTimeAsync(0);

      // The live page is empty, yet the peer still learns the scope.
      expect(pageChangeSends()).toEqual([
        [DataMsgBodyType.PAGE_CHANGE, { message: '2', to: 'peer1' }],
      ]);
      expect(sends(DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE)).toHaveLength(0);
      expect(loadWhiteboardPageSnapshot).not.toHaveBeenCalled();
    });

    it('redirects a stale peer to the presenter file', async () => {
      const controller = await presenterOn('file2', 3, [{ userId: 'peer1' }]);

      controller.handleMessage(
        DataMsgBodyType.WHITEBOARD_SYNC_REQUEST,
        emptyStateVector,
        'peer1',
        'req-stale-file',
        scope('file1', 1),
      );
      await vi.advanceTimersByTimeAsync(0);

      expect(fileChangeSends()).toEqual([
        [
          DataMsgBodyType.FILE_CHANGE,
          { message: JSON.stringify({ fileId: 'file2', page: 3 }), to: 'peer1' },
        ],
      ]);
      expect(sends(DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE)).toHaveLength(0);
    });

    it('answers a sync request that matches the active scope', async () => {
      const controller = await presenterOn('file1', 1, [{ userId: 'peer1' }]);
      controller.mergeElements([el('el1')]);
      conn.sendWhiteboardData.mockClear();

      controller.handleMessage(
        DataMsgBodyType.WHITEBOARD_SYNC_REQUEST,
        emptyStateVector,
        'peer1',
        'req-live',
        scope('file1', 1),
      );
      await vi.advanceTimersByTimeAsync(1000);

      const responses = sends(DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE);
      expect(responses).toHaveLength(1);
      expect(JSON.parse(responses[0][1].message!)).toMatchObject({ fileId: 'file1', page: 1 });
      expect(pageChangeSends()).toHaveLength(0);
    });

    it('still serves a cached snapshot to a non-presenter requesting another page', async () => {
      const controller = await followerOn('file1', 1);
      vi.mocked(loadWhiteboardPageSnapshot).mockResolvedValueOnce(update('snapshot'));
      conn.sendWhiteboardData.mockClear();

      controller.handleMessage(
        DataMsgBodyType.WHITEBOARD_SYNC_REQUEST,
        emptyStateVector,
        'peer1',
        'req-old-page',
        scope('file1', 5),
      );
      await vi.advanceTimersByTimeAsync(1000);

      expect(loadWhiteboardPageSnapshot).toHaveBeenCalledWith('file1', 5);
      const responses = sends(DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE);
      expect(responses).toHaveLength(1);
      expect(JSON.parse(responses[0][1].message!)).toEqual({
        fileId: 'file1',
        page: 5,
        gzip: true,
      });
      expect(pageChangeSends()).toHaveLength(0);
      expect(fileChangeSends()).toHaveLength(0);
    });
  });

  describe('blank pages', () => {
    it('bootstraps a new joiner from an empty presenter page', async () => {
      const controller = await presenterOn('file1', 2, [{ userId: 'peer1' }]);

      controller.handleMessage(
        DataMsgBodyType.WHITEBOARD_SYNC_REQUEST,
        emptyStateVector,
        'peer1',
        'req-bootstrap',
      );
      await vi.advanceTimersByTimeAsync(1000);

      const responses = sends(DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE);
      expect(responses).toHaveLength(1);
      expect(JSON.parse(responses[0][1].message!)).toMatchObject({
        fileId: 'file1',
        page: 2,
        gzip: true,
      });
      expect(JSON.parse(JSON.parse(responses[0][1].message!).initial_data)).toMatchObject({
        currentWhiteboardOfficeFileId: 'file1',
        currentPageNumber: 2,
      });
      expect(loadWhiteboardPageSnapshot).not.toHaveBeenCalled();
    });

    it('answers a state-vector request on an empty presenter page', async () => {
      const controller = await presenterOn('file1', 1, [{ userId: 'peer1' }]);

      controller.handleMessage(
        DataMsgBodyType.WHITEBOARD_SYNC_REQUEST,
        emptyStateVector,
        'peer1',
        'req-empty-live',
        scope('file1', 1),
      );
      await vi.advanceTimersByTimeAsync(1000);

      const responses = sends(DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE);
      expect(responses).toHaveLength(1);
      expect(JSON.parse(responses[0][1].message!)).toMatchObject({
        fileId: 'file1',
        page: 1,
        stateVector: expect.any(String),
      });
      expect(loadWhiteboardPageSnapshot).not.toHaveBeenCalled();
    });

    it('does not let an empty follower claim the active scope', async () => {
      const controller = await followerOn('file1', 1);

      controller.handleMessage(
        DataMsgBodyType.WHITEBOARD_SYNC_REQUEST,
        emptyStateVector,
        'peer2',
        'req-empty-follower',
        scope('file1', 1),
      );
      await vi.advanceTimersByTimeAsync(1000);

      expect(sends(DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE)).toHaveLength(0);
      // Only a stored snapshot could answer, and there is none.
      expect(loadWhiteboardPageSnapshot).toHaveBeenCalledWith('file1', 1);
    });

    it('is not authoritative while the presenter is still switching', async () => {
      const controller = await presenterOn('file1', 1, [{ userId: 'peer1' }]);
      // Redux already moved to page 2 while `doc` still holds page 1.
      (state.current as { whiteboard: { currentPage: number } }).whiteboard.currentPage = 2;

      controller.handleMessage(
        DataMsgBodyType.WHITEBOARD_SYNC_REQUEST,
        emptyStateVector,
        'peer1',
        'req-in-flight',
        scope('file1', 1),
      );
      await vi.advanceTimersByTimeAsync(1000);

      expect(sends(DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE)).toHaveLength(0);
      expect(loadWhiteboardPageSnapshot).toHaveBeenCalledWith('file1', 1);
    });
  });
});
