import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import {
  DataMsgBodyType,
  NatsMsgClientToServerEvents,
  SessionDataType,
} from 'plugnmeet-protocol-js';
import type { SessionDataHeader } from 'plugnmeet-protocol-js';

/*
 * applyExternalWrite tests: the real controller/yjs run; only NATS and the
 * Redux store are mocked. The editor side is replaced by a fake applier, which
 * is exactly what the real editor registers.
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

import { NotepadController, NOTEPAD_SNAPSHOT_KEY } from '../NotepadController';
import { diffKeyOf } from '../../../helpers/collab-sync/sessionDataSync';

const DIFF_KEY = diffKeyOf(NOTEPAD_SNAPSHOT_KEY);

let active: NotepadController | null = null;

const setStore = ({
  presenter = false,
  locked = true,
}: { presenter?: boolean; locked?: boolean } = {}) => {
  state.current = {
    session: {
      currentUser: {
        userId: 'me',
        isRecorder: false,
        metadata: {
          isPresenter: presenter,
          isAdmin: false,
          lockSettings: { lockSharedNotepad: locked },
        },
      },
      currentRoom: {
        metadata: { roomFeatures: { sharedNotePadFeatures: { isAllow: true, isActive: true } } },
      },
    },
    participants: [
      {
        userId: 'me',
        isOnline: true,
        joinedAt: 1,
        metadata: { isPresenter: presenter, isAdmin: false },
      },
    ],
  };
};

const header = (key: string) => ({ dataType: SessionDataType.NOTEPAD, key }) as SessionDataHeader;

const saveCalls = () =>
  (conn.sendMessageToCoreWorker.mock.calls as unknown as [{ event: number }][]).filter(
    ([m]) => m.event === NatsMsgClientToServerEvents.SESSION_DATA_SAVE,
  );

const notepadUpdates = () =>
  (conn.publishData.mock.calls as unknown as [DataMsgBodyType][]).filter(
    ([type]) => type === DataMsgBodyType.NOTEPAD_UPDATE,
  );

const makeController = async () => {
  const controller = new NotepadController();
  active = controller;
  const syncing = controller.sync();
  await vi.advanceTimersByTimeAsync(0);
  controller.handleSessionDataResponse(header(NOTEPAD_SNAPSHOT_KEY), new Uint8Array(0));
  await vi.advanceTimersByTimeAsync(0);
  controller.handleSessionDataResponse(header(DIFF_KEY), new Uint8Array(0));
  await vi.advanceTimersByTimeAsync(0);
  await syncing;
  return controller;
};

/** Very small stand-in for the editor: replaces / appends a Y.XmlText run. */
const fakeApplier =
  (calls: { mode: string; markdown: string; heading?: string }[], ids: string[] = []) =>
  (request: { mode: string; markdown: string; heading?: string }) => {
    calls.push(request);
    const fragment = active?.getSnapshot().fragment;
    if (!fragment) {
      return [];
    }
    if (request.mode === 'replace') {
      fragment.delete(0, fragment.length);
    }
    fragment.insert(fragment.length, [new Y.XmlText(request.markdown)]);
    return ids.map((id) => ({ id, text: request.markdown }));
  };

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  setStore();
  (globalThis as { document: unknown }).document = {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
  };
});

afterEach(async () => {
  const controller = active;
  active = null;
  if (controller) {
    await controller.destroy();
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('NotepadController.applyExternalWrite', () => {
  it('fails before the notepad is set up', () => {
    const controller = new NotepadController();
    active = controller;

    const res = controller.applyExternalWrite('append', 'hello');

    expect(res.ok).toBe(false);
    expect(res.length).toBe(0);
    expect(res.error).toBeTruthy();
  });

  it('fails when no editor applier is registered', async () => {
    const controller = await makeController();

    const res = controller.applyExternalWrite('append', 'hello');

    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it('writes, broadcasts and persists even for a locked non-presenter', async () => {
    const controller = await makeController();
    const calls: { mode: string; markdown: string; heading?: string }[] = [];
    controller.setExternalWriteApplier(fakeApplier(calls));

    const res = controller.applyExternalWrite('append', 'agent notes', 'Summary');

    expect(res).toEqual({ ok: true, length: 'agent notes'.length });
    expect(calls).toEqual([{ mode: 'append', markdown: 'agent notes', heading: 'Summary' }]);

    // the blocked participant still publishes to peers and saves on the server
    expect(notepadUpdates()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(saveCalls().length).toBeGreaterThan(0);
  });

  it('runs the whole write in a single local transaction', async () => {
    const controller = await makeController();
    const origins: unknown[] = [];
    controller.getSnapshot().doc?.on('update', (_update, origin) => origins.push(origin));

    // two separate inserts inside one applier call must arrive as one update
    controller.setExternalWriteApplier((request) => {
      const fragment = active?.getSnapshot().fragment;
      fragment?.insert(0, [new Y.XmlText(request.markdown)]);
      fragment?.insert(0, [new Y.XmlText('prefix ')]);
      return [];
    });
    controller.applyExternalWrite('append', 'text');

    expect(origins).toEqual(['local-external-write']);
    expect(notepadUpdates()).toHaveLength(1);
  });

  it('reports a stale block_id as a failed in-place rewrite', async () => {
    const controller = await makeController();
    controller.setExternalWriteApplier(() => []);

    const res = controller.applyExternalWrite('replace_block', 'fixed answer', undefined, 'gone');

    expect(res.ok).toBe(false);
    expect(res.error).toContain('block_id "gone" was not found');
    expect(notepadUpdates()).toHaveLength(0);
  });

  it('passes the block id to the applier', async () => {
    const controller = await makeController();
    const calls: { mode: string; blockId?: string }[] = [];
    controller.setExternalWriteApplier((request) => {
      calls.push({ mode: request.mode, blockId: request.blockId });
      return [{ id: 'b2', text: 'marked' }];
    });

    const res = controller.applyExternalWrite('replace_block', 'marked', undefined, ' b2 ');

    expect(res.ok).toBe(true);
    expect(calls).toEqual([{ mode: 'replace_block', blockId: 'b2' }]);
  });

  it('reports an applier failure as a failed result', async () => {
    const controller = await makeController();
    controller.setExternalWriteApplier(() => {
      throw new Error('boom');
    });

    const res = controller.applyExternalWrite('replace', 'text');

    expect(res.ok).toBe(false);
    expect(res.error).toBe('boom');
  });

  it('records the blocks an external write produced', async () => {
    const controller = await makeController();
    controller.setExternalWriteApplier(fakeApplier([], ['a1', 'a2']));

    controller.applyExternalWrite('append', 'agent notes');

    expect(controller.getExternalBlockText('a1')).toBe('agent notes');
    expect(controller.isExternalBlock('a2')).toBe(true);
    expect(controller.getExternalBlockText('unknown')).toBeNull();
    expect(controller.isExternalBlock('unknown')).toBe(false);
  });

  it('forgets the previous authorship on a replace write', async () => {
    const controller = await makeController();
    controller.setExternalWriteApplier(fakeApplier([], ['a1']));
    controller.applyExternalWrite('append', 'first');
    expect(controller.isExternalBlock('a1')).toBe(true);

    controller.setExternalWriteApplier(fakeApplier([], ['b1']));
    controller.applyExternalWrite('replace', 'second');

    expect(controller.isExternalBlock('a1')).toBe(false);
    expect(controller.getExternalBlockText('b1')).toBe('second');
  });

  it('reports participant edits but not its own external writes', async () => {
    const controller = await makeController();
    const listener = vi.fn();
    controller.onParticipantContentChange(listener);
    controller.setExternalWriteApplier(fakeApplier([], ['a1']));

    controller.applyExternalWrite('append', 'agent notes');
    expect(listener).not.toHaveBeenCalled();

    // The participant typing in the same document is not an external write.
    controller.getSnapshot().fragment?.insert(0, [new Y.XmlText('my answer')]);
    expect(listener).toHaveBeenCalled();
  });
});
