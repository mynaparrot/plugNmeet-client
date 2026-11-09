import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import {
  DataMsgBodyType,
  NatsMsgClientToServerEvents,
  SessionDataType,
} from 'plugnmeet-protocol-js';
import type { DataChannelMessage, SessionDataHeader } from 'plugnmeet-protocol-js';

/*
 * NotepadController session-data tests: the real controller/yjs run; only NATS
 * and the Redux store are mocked.
 */

const { conn, state, nats } = vi.hoisted(() => ({
  conn: {
    userId: 'me',
    enableE2EE: false,
    encryptData: vi.fn(async (payload: Uint8Array): Promise<Uint8Array | undefined> => payload),
    sendMessageToSystemWorker: vi.fn(),
    sendMessageToCoreWorker: vi.fn(),
    publishData: vi.fn(async (..._args: unknown[]) => undefined),
    onReconnect: vi.fn(),
  },
  state: { current: {} as Record<string, unknown> },
  nats: { connected: true },
}));

vi.mock('../../../helpers/nats', () => ({
  getNatsConn: () => (nats.connected ? conn : undefined),
}));

vi.mock('../../../store', () => ({
  store: { getState: () => state.current },
}));

vi.mock('../../../store/slices/participantSlice', () => ({
  participantsSelector: { selectAll: (s: { participants: unknown[] }) => s.participants },
}));

vi.mock('../../../helpers/utils', () => ({
  uint8ToBase64: (value: Uint8Array) => Buffer.from(value).toString('base64'),
  base64ToUint8: (value: string) => new Uint8Array(Buffer.from(value, 'base64')),
  isUserRecorder: (userId: string) => userId === 'RECORDER_BOT' || userId === 'RTMP_BOT',
}));

import { NOTEPAD_SNAPSHOT_KEY, NotepadController } from '../NotepadController';
import {
  CANONICAL_RETRY_BASE_MS,
  SAVE_ACK_TIMEOUT_MS,
  SAVE_MAX_WAIT_MS,
  SAVE_RETRY_BASE_MS,
  SERVER_FIRST_SYNC_TIMEOUT_MS,
  SessionDataSyncState,
  compress,
  decompress,
  diffKeyOf,
} from '../../../helpers/collab-sync/sessionDataSync';
import type { SequentialSyncRequest } from '../../../helpers/collab-sync/sequentialSyncRequest';
import {
  ANTI_ENTROPY_INTERVAL_MS,
  SYNC_TARGET_TIMEOUT_MS,
} from '../../../helpers/collab-sync/sequentialSyncRequest';

const FRAGMENT = 'document-store';
const DIFF_KEY = diffKeyOf(NOTEPAD_SNAPSHOT_KEY);

type Peer = { userId: string; presenter?: boolean; admin?: boolean };

const setStore = ({
  presenter = true,
  admin = false,
  peers = [],
}: {
  presenter?: boolean;
  admin?: boolean;
  peers?: Peer[];
} = {}) => {
  state.current = {
    session: {
      currentUser: {
        userId: 'me',
        isRecorder: false,
        metadata: {
          isPresenter: presenter,
          isAdmin: admin,
          lockSettings: { lockSharedNotepad: false },
        },
      },
      currentRoom: {
        metadata: { roomFeatures: { sharedNotePadFeatures: { isAllow: true, isActive: true } } },
      },
    },
    participants: [
      { userId: 'me', isOnline: true, joinedAt: 1, metadata: { isPresenter: presenter } },
      ...peers.map((p, i) => ({
        userId: p.userId,
        isOnline: true,
        joinedAt: 2 + i,
        metadata: { isPresenter: !!p.presenter, isAdmin: !!p.admin },
      })),
    ],
  };
};

interface Internals {
  doc: Y.Doc | null;
  snapshotConfirmed: boolean;
  saveTimer: ReturnType<typeof setTimeout> | null;
  saveRetryTimer: ReturnType<typeof setTimeout> | null;
  snapshotRetryTimer: ReturnType<typeof setTimeout> | null;
  antiEntropyTimer: ReturnType<typeof setTimeout> | null;
  syncRequest: SequentialSyncRequest;
  syncState: SessionDataSyncState;
  sessionData: {
    sessionDataWaiters: Map<string, unknown>;
    saveAckWaiters: Map<string, unknown>;
  };
}

const internals = (controller: NotepadController) => controller as unknown as Internals;

let active: NotepadController | null = null;
const captured = { docAtDiffFetch: '' };

const makeController = () => {
  active = new NotepadController();
  return active;
};

const header = (key: string) => ({ dataType: SessionDataType.NOTEPAD, key }) as SessionDataHeader;

type SaveCall = { event: number; msg: string; binMsg?: Uint8Array };

const saveCalls = () =>
  (conn.sendMessageToCoreWorker.mock.calls as unknown as [SaveCall][]).filter(
    ([m]) => m.event === NatsMsgClientToServerEvents.SESSION_DATA_SAVE,
  );
const saveHeaders = () => saveCalls().map(([m]) => JSON.parse(m.msg) as Record<string, string>);

const fetchKeys = () =>
  (conn.sendMessageToSystemWorker.mock.calls as unknown as [{ msg: string }][]).map(
    ([m]) => (JSON.parse(m.msg) as { key: string }).key,
  );

const ackSave = (controller: NotepadController, index: number, success = true) => {
  const h = saveHeaders()[index];
  if (!h) return;
  controller.handleSessionDataSaveResponse({
    dataType: SessionDataType.NOTEPAD,
    key: h.key,
    requestId: h.requestId,
    success,
  } as SessionDataHeader);
};

/** Yjs update carrying `text` in the notepad fragment. */
const remoteUpdate = (text: string) => {
  const source = new Y.Doc();
  source.getXmlFragment(FRAGMENT).insert(0, [new Y.XmlText(text)]);
  return Y.encodeStateAsUpdate(source);
};

const textOf = (doc: Y.Doc | null) => (doc ? doc.getXmlFragment(FRAGMENT).toString() : '');

const edit = (controller: NotepadController, text = 'local') => {
  controller
    .getSnapshot()
    .doc?.getXmlFragment(FRAGMENT)
    .insert(0, [new Y.XmlText(text)]);
};

/** Run setup to completion, confirming the canonical key with an empty response. */
const setupConfirmed = async (controller: NotepadController) => {
  const syncing = controller.sync();
  await vi.advanceTimersByTimeAsync(0);
  controller.handleSessionDataResponse(header(NOTEPAD_SNAPSHOT_KEY), new Uint8Array(0));
  await vi.advanceTimersByTimeAsync(0);
  controller.handleSessionDataResponse(header(DIFF_KEY), new Uint8Array(0));
  await vi.advanceTimersByTimeAsync(0);
  await syncing;
};

/** Run setup with the canonical fetch (twice) and the diff fetch timing out. */
const setupTimedOut = async (controller: NotepadController) => {
  const syncing = controller.sync();
  await vi.advanceTimersByTimeAsync(SERVER_FIRST_SYNC_TIMEOUT_MS * 3);
  await syncing;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  setStore();
  captured.docAtDiffFetch = '';
  (globalThis as { document: unknown }).document = {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
  };
  // Record what the doc holds at the moment the diff fetch goes out.
  conn.sendMessageToSystemWorker.mockImplementation((m: { msg: string }) => {
    if ((JSON.parse(m.msg) as { key: string }).key === DIFF_KEY) {
      captured.docAtDiffFetch = textOf(active ? internals(active).doc : null);
    }
  });
});

afterEach(async () => {
  const controller = active;
  active = null;
  if (controller) {
    const done = controller.destroy();
    for (let i = 0; i < 2; i++) {
      await vi.advanceTimersByTimeAsync(SAVE_ACK_TIMEOUT_MS);
      ackSave(controller, saveCalls().length - 1, false);
    }
    await done;
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('canonical confirmation', () => {
  it('ignores stray keys and applies the canonical snapshot before the diff fetch', async () => {
    const controller = makeController();
    const syncing = controller.sync();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchKeys()).toEqual([NOTEPAD_SNAPSHOT_KEY]);

    // A response for an unrelated key must not end the canonical wait.
    controller.handleSessionDataResponse(header('other'), remoteUpdate('nope'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchKeys()).toEqual([NOTEPAD_SNAPSHOT_KEY]);
    expect(textOf(controller.getSnapshot().doc)).toBe('');

    controller.handleSessionDataResponse(header(NOTEPAD_SNAPSHOT_KEY), remoteUpdate('hello'));
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchKeys()).toEqual([NOTEPAD_SNAPSHOT_KEY, DIFF_KEY]);
    expect(captured.docAtDiffFetch).toBe('hello');
    expect(internals(controller).snapshotConfirmed).toBe(true);

    controller.handleSessionDataResponse(header(DIFF_KEY), new Uint8Array(0));
    await vi.advanceTimersByTimeAsync(0);
    await syncing;
    expect(textOf(controller.getSnapshot().doc)).toBe('hello');
  });

  it('an empty canonical response also confirms the key', async () => {
    const controller = makeController();
    await setupConfirmed(controller);
    expect(internals(controller).snapshotConfirmed).toBe(true);
  });

  it('a presenter online counts as confirmed, so saves go to the canonical key', async () => {
    // No hydration happens in that case: nothing is fetched, so the canonical
    // key is treated as authoritative.
    setStore({ peers: [{ userId: 'p1', presenter: true }] });
    const controller = makeController();
    await controller.sync();
    expect(fetchKeys()).toEqual([]);
    expect(internals(controller).snapshotConfirmed).toBe(true);

    edit(controller, 'local');
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);
    expect(saveHeaders()[0].key).toBe(NOTEPAD_SNAPSHOT_KEY);
  });
});

describe('saves while unconfirmed', () => {
  it('sends the full state to the diff key and leaves the baseline untouched', async () => {
    const controller = makeController();
    await setupTimedOut(controller);
    expect(internals(controller).snapshotConfirmed).toBe(false);
    // One immediate retry of the canonical fetch happens during setup.
    expect(fetchKeys().filter((k) => k === NOTEPAD_SNAPSHOT_KEY)).toHaveLength(2);

    edit(controller, 'local');
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);

    const [call] = saveCalls();
    expect(saveHeaders()[0].key).toBe(DIFF_KEY);
    // The payload is the full state, not a diff.
    const doc = new Y.Doc();
    Y.applyUpdate(doc, decompress(call[0].binMsg!));
    expect(textOf(doc)).toBe('local');
    expect(internals(controller).syncState.hasCheckpoint).toBe(false);
  });
});

describe('canonical retry', () => {
  it('confirms on a later backoff retry and uploads a checkpoint to the canonical key', async () => {
    const controller = makeController();
    await setupTimedOut(controller);
    expect(fetchKeys().filter((k) => k === NOTEPAD_SNAPSHOT_KEY)).toHaveLength(2);
    expect(internals(controller).snapshotConfirmed).toBe(false);
    expect(internals(controller).snapshotRetryTimer).not.toBeNull();

    // First retry: the fetch goes out and times out again, so a longer backoff
    // is armed.
    await vi.advanceTimersByTimeAsync(CANONICAL_RETRY_BASE_MS);
    expect(internals(controller).snapshotRetryTimer).toBeNull();
    await vi.advanceTimersByTimeAsync(SERVER_FIRST_SYNC_TIMEOUT_MS);
    expect(internals(controller).snapshotConfirmed).toBe(false);
    expect(internals(controller).snapshotRetryTimer).not.toBeNull();

    // Second retry (attempt 1 → 2 * base): answer it with the snapshot.
    await vi.advanceTimersByTimeAsync(CANONICAL_RETRY_BASE_MS * 2);
    controller.handleSessionDataResponse(header(NOTEPAD_SNAPSHOT_KEY), remoteUpdate('from-server'));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);

    expect(internals(controller).snapshotConfirmed).toBe(true);
    expect(internals(controller).snapshotRetryTimer).toBeNull();
    expect(textOf(controller.getSnapshot().doc)).toBe('from-server');
    // The retry uploads a checkpoint straight to the canonical key.
    const headers = saveHeaders();
    expect(headers).toHaveLength(1);
    expect(headers[0].key).toBe(NOTEPAD_SNAPSHOT_KEY);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, decompress(saveCalls()[0][0].binMsg!));
    expect(textOf(doc)).toBe('from-server');
  });
});

describe('save acks', () => {
  it('an acked checkpoint becomes the diff baseline', async () => {
    const controller = makeController();
    await setupConfirmed(controller);

    edit(controller, 'one');
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);
    expect(saveHeaders()[0].key).toBe(NOTEPAD_SNAPSHOT_KEY);
    ackSave(controller, 0, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(internals(controller).syncState.hasCheckpoint).toBe(true);

    edit(controller, 'two');
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);
    expect(saveHeaders()[1].key).toBe(DIFF_KEY);
  });

  it('a failed ack keeps the baseline unset and arms a retry', async () => {
    const controller = makeController();
    await setupConfirmed(controller);

    edit(controller, 'one');
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);
    ackSave(controller, 0, false);
    await vi.advanceTimersByTimeAsync(0);

    expect(internals(controller).syncState.hasCheckpoint).toBe(false);
    expect(internals(controller).saveRetryTimer).not.toBeNull();
  });

  it('retries a failed save with exponential backoff', async () => {
    const controller = makeController();
    await setupConfirmed(controller);

    edit(controller, 'one');
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);
    ackSave(controller, 0, false);
    await vi.advanceTimersByTimeAsync(0);
    expect(saveCalls()).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(SAVE_RETRY_BASE_MS - 1);
    expect(saveCalls()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(saveCalls()).toHaveLength(2);

    ackSave(controller, 1, false);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(SAVE_RETRY_BASE_MS * 2 - 1);
    expect(saveCalls()).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(saveCalls()).toHaveLength(3);
  });
});

describe('users without session-data access', () => {
  it('never saves and never arms a retry', async () => {
    setStore({ presenter: false, admin: false });
    const controller = makeController();
    await setupTimedOut(controller);

    edit(controller, 'local');
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);

    expect(saveCalls()).toHaveLength(0);
    expect(internals(controller).saveRetryTimer).toBeNull();
  });
});

describe('teardown', () => {
  it('cancels pending fetches, the retry timer and resets confirmation', async () => {
    const controller = makeController();
    await setupConfirmed(controller);

    edit(controller, 'one');
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);
    ackSave(controller, 0, false);
    await vi.advanceTimersByTimeAsync(0);
    expect(internals(controller).saveRetryTimer).not.toBeNull();

    const pendingFetch = controller.fetchSessionData(NOTEPAD_SNAPSHOT_KEY);
    expect(internals(controller).sessionData.sessionDataWaiters.size).toBe(1);

    const destroying = controller.destroy();
    active = null;
    await vi.advanceTimersByTimeAsync(0);
    await destroying;

    await expect(pendingFetch).resolves.toBe(false);
    expect(internals(controller).sessionData.sessionDataWaiters.size).toBe(0);
    expect(internals(controller).saveRetryTimer).toBeNull();
    expect(internals(controller).saveTimer).toBeNull();
    expect(internals(controller).snapshotConfirmed).toBe(false);
  });

  it('clears the snapshot retry timer', async () => {
    const controller = makeController();
    await setupTimedOut(controller);
    expect(internals(controller).snapshotRetryTimer).not.toBeNull();

    const destroying = controller.destroy();
    active = null;
    await vi.advanceTimersByTimeAsync(0);
    await destroying;

    expect(internals(controller).snapshotRetryTimer).toBeNull();
  });
});

describe('peer sync requests', () => {
  type DataCall = [
    DataMsgBodyType,
    { id: string; to?: string; binMessage?: Uint8Array; message?: string },
  ];

  const dataCalls = () => conn.publishData.mock.calls as unknown as DataCall[];
  const requests = () =>
    dataCalls()
      .filter(([type]) => type === DataMsgBodyType.NOTEPAD_SYNC_REQUEST)
      .map(([, payload]) => payload);
  const responses = () =>
    dataCalls()
      .filter(([type]) => type === DataMsgBodyType.NOTEPAD_SYNC_RESPONSE)
      .map(([, payload]) => payload);

  /** A peer answer carrying `text`, gzip'd like the real protocol payload. */
  const syncAnswer = (id: string, text: string) => {
    const source = new Y.Doc();
    source.getXmlFragment(FRAGMENT).insert(0, [new Y.XmlText(text)]);
    const stateVector = Buffer.from(Y.encodeStateVector(source)).toString('base64');
    return {
      type: DataMsgBodyType.NOTEPAD_SYNC_RESPONSE,
      fromUserId: 'peer',
      id,
      binMessage: compress(Y.encodeStateAsUpdate(source)),
      message: JSON.stringify({ stateVector }),
    } as unknown as DataChannelMessage;
  };

  /** Controller with a live doc, empty publish log and the given peers. */
  const ready = async (peers?: Peer[]) => {
    const controller = makeController();
    await setupConfirmed(controller);
    if (peers) {
      setStore({ peers });
    }
    conn.publishData.mockClear();
    return controller;
  };

  it('asks one peer at a time: presenter first, recorder last', async () => {
    const controller = await ready([
      { userId: 'RECORDER_BOT' },
      { userId: 'u1' },
      { userId: 'pres', presenter: true },
    ]);

    controller.resync();
    expect(requests().map((p) => p.to)).toEqual(['pres']);

    await vi.advanceTimersByTimeAsync(SYNC_TARGET_TIMEOUT_MS - 1);
    expect(requests().map((p) => p.to)).toEqual(['pres']);

    await vi.advanceTimersByTimeAsync(1);
    expect(requests().map((p) => p.to)).toEqual(['pres', 'u1']);

    await vi.advanceTimersByTimeAsync(SYNC_TARGET_TIMEOUT_MS);
    expect(requests().map((p) => p.to)).toEqual(['pres', 'u1', 'RECORDER_BOT']);

    // Every request carries its own id.
    expect(new Set(requests().map((p) => p.id)).size).toBe(3);
  });

  it('answers a sync request straight back to the requester', async () => {
    const controller = await ready();

    controller.handleNotepadMessage({
      type: DataMsgBodyType.NOTEPAD_SYNC_REQUEST,
      fromUserId: 'peer',
      id: 'req-1',
      binMessage: Y.encodeStateVector(new Y.Doc()),
    } as unknown as DataChannelMessage);

    // No timers advanced: the answer must not be delayed or broadcast.
    const [answer] = responses();
    expect(answer.id).toBe('req-1');
    expect(answer.to).toBe('peer');
    expect(answer.binMessage!.length).toBeGreaterThan(0);
    expect(answer.message).toContain('stateVector');
  });

  it('accepts a late answer from an earlier peer and never asks it again', async () => {
    const controller = await ready([{ userId: 'a1' }, { userId: 'a2' }]);

    controller.resync();
    await vi.advanceTimersByTimeAsync(SYNC_TARGET_TIMEOUT_MS);
    expect(requests().map((p) => p.to)).toEqual(['a1', 'a2']);

    // a1 answers late: applied, a2's wait is undisturbed and a1 is done.
    controller.handleNotepadMessage(syncAnswer(requests()[0].id, 'from-a1'));
    await vi.advanceTimersByTimeAsync(0);
    expect(textOf(controller.getSnapshot().doc)).toBe('from-a1');
    expect(requests().map((p) => p.to)).toEqual(['a1', 'a2']);

    // Both peers answered: the run is over, nobody is asked again.
    controller.handleNotepadMessage(syncAnswer(requests()[1].id, 'from-a2'));
    await vi.advanceTimersByTimeAsync(SYNC_TARGET_TIMEOUT_MS * 6);
    expect(requests()).toHaveLength(2);
  });

  it('an answer advances the run and the next request carries the updated state vector', async () => {
    const controller = await ready([{ userId: 'a1' }, { userId: 'a2' }]);

    controller.resync();
    const first = requests()[0];
    // Empty doc: an empty state vector.
    expect(Y.decodeStateVector(first.binMessage!).size).toBe(0);

    controller.handleNotepadMessage(syncAnswer(first.id, 'from-a1'));
    await vi.advanceTimersByTimeAsync(0);

    // The next peer is asked at once, with a state vector that includes the answer.
    const second = requests()[1];
    expect(second.to).toBe('a2');
    expect(Y.decodeStateVector(second.binMessage!).size).toBe(1);
  });

  it('asks the next peer when an answer is unusable', async () => {
    const controller = await ready([{ userId: 'a1' }, { userId: 'a2' }]);

    controller.resync();
    controller.handleNotepadMessage({
      type: DataMsgBodyType.NOTEPAD_SYNC_RESPONSE,
      fromUserId: 'a1',
      id: requests()[0].id,
      binMessage: new Uint8Array([1, 2, 3]),
    } as unknown as DataChannelMessage);

    expect(requests().map((p) => p.to)).toEqual(['a1', 'a2']);
  });

  it('ignores a resync while a run is active', async () => {
    const controller = await ready([{ userId: 'a1' }, { userId: 'a2' }]);

    controller.resync();
    controller.resync();

    expect(requests()).toHaveLength(1);
  });

  it('teardown cancels the run', async () => {
    const controller = await ready([{ userId: 'a1' }, { userId: 'a2' }]);

    controller.resync();
    expect(requests()).toHaveLength(1);

    const destroying = controller.destroy();
    active = null;
    await vi.advanceTimersByTimeAsync(0);
    await destroying;

    await vi.advanceTimersByTimeAsync(SYNC_TARGET_TIMEOUT_MS * 10);
    expect(requests()).toHaveLength(1);
  });
});

describe('anti-entropy', () => {
  const requests = () =>
    (conn.publishData.mock.calls as unknown as [DataMsgBodyType, { id: string; to?: string }][])
      .filter(([type]) => type === DataMsgBodyType.NOTEPAD_SYNC_REQUEST)
      .map(([, payload]) => payload);

  const setVisibility = (state: 'visible' | 'hidden') => {
    (globalThis as unknown as { document: { visibilityState: string } }).document.visibilityState =
      state;
  };

  /** Setup done with the jitter pinned to 0, so ticks land exactly on the interval. */
  const ready = async (peers: Peer[]) => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // restored in afterEach
    const controller = makeController();
    await setupConfirmed(controller);
    setStore({ peers });
    conn.publishData.mockClear();
    return controller;
  };

  /** Ends the run waiting on `id` with a no-op update. */
  const answerTo = (controller: NotepadController, id: string) =>
    controller.handleNotepadMessage({
      type: DataMsgBodyType.NOTEPAD_SYNC_RESPONSE,
      fromUserId: 'pres',
      id,
      binMessage: compress(Y.encodeStateAsUpdate(new Y.Doc())),
    } as unknown as DataChannelMessage);

  const destroy = async (controller: NotepadController) => {
    const destroying = controller.destroy();
    active = null;
    await vi.advanceTimersByTimeAsync(0);
    await destroying;
  };

  it('asks one randomly chosen ranked target once the interval elapses', async () => {
    const controller = await ready([{ userId: 'u1' }, { userId: 'pres', presenter: true }]);
    expect(internals(controller).antiEntropyTimer).not.toBeNull();
    const start = vi.spyOn(internals(controller).syncRequest, 'start');

    await vi.advanceTimersByTimeAsync(ANTI_ENTROPY_INTERVAL_MS - 1);
    expect(requests()).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(start).toHaveBeenCalledWith(1, true);
    expect(requests()).toHaveLength(1);
    expect(['pres', 'u1']).toContain(requests()[0].to);
  });

  it('skips a tick while the tab is hidden and resumes when visible', async () => {
    const controller = await ready([{ userId: 'pres', presenter: true }]);

    setVisibility('hidden');
    await vi.advanceTimersByTimeAsync(ANTI_ENTROPY_INTERVAL_MS);
    expect(requests()).toHaveLength(0);

    // The timer re-armed while hidden, so the next tick fires once visible.
    setVisibility('visible');
    await vi.advanceTimersByTimeAsync(ANTI_ENTROPY_INTERVAL_MS);
    expect(requests()).toHaveLength(1);
    answerTo(controller, requests()[0].id);
  });

  it('skips a tick while a sync run is active', async () => {
    const controller = await ready([{ userId: 'pres', presenter: true }]);
    const syncRequest = internals(controller).syncRequest;
    const start = vi.spyOn(syncRequest, 'start');
    Object.defineProperty(syncRequest, 'active', { configurable: true, get: () => true });

    await vi.advanceTimersByTimeAsync(ANTI_ENTROPY_INTERVAL_MS);
    expect(start).not.toHaveBeenCalled();
    expect(requests()).toHaveLength(0);
  });

  it('re-arms after every tick', async () => {
    const controller = await ready([{ userId: 'pres', presenter: true }]);

    await vi.advanceTimersByTimeAsync(ANTI_ENTROPY_INTERVAL_MS);
    expect(requests()).toHaveLength(1);
    answerTo(controller, requests()[0].id);
    await vi.advanceTimersByTimeAsync(0);
    expect(internals(controller).antiEntropyTimer).not.toBeNull();

    await vi.advanceTimersByTimeAsync(ANTI_ENTROPY_INTERVAL_MS - 1);
    expect(requests()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests()).toHaveLength(2);
  });

  it('teardown stops the timer', async () => {
    const controller = await ready([{ userId: 'pres', presenter: true }]);

    await vi.advanceTimersByTimeAsync(ANTI_ENTROPY_INTERVAL_MS);
    expect(requests()).toHaveLength(1);

    await destroy(controller);
    expect(internals(controller).antiEntropyTimer).toBeNull();

    await vi.advanceTimersByTimeAsync(ANTI_ENTROPY_INTERVAL_MS * 3);
    expect(requests()).toHaveLength(1);
  });
});
