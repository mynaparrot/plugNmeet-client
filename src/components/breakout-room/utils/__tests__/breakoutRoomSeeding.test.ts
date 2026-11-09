import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NatsMsgClientToServerEvents } from 'plugnmeet-protocol-js';
import * as Y from 'yjs';

type SaveMsg = { event: number; msg: string; binMsg: Uint8Array };

const { conn, state } = vi.hoisted(() => ({
  conn: {
    enableE2EE: true,
    sendMessageToCoreWorker: vi.fn(),
    sendMessageToSystemWorker: vi.fn(),
  },
  state: {
    connected: true,
    notepadDoc: null as Y.Doc | null,
    wbSnapshot: null as { doc: Y.Doc; fileId: string; page: number } | null,
    fetched: [] as string[],
    pageSnapshot: null as Uint8Array | null,
    encrypted: [] as { value: Uint8Array; key: unknown }[],
  },
}));

vi.mock('../../../../helpers/nats', () => ({
  getNatsConn: () => (state.connected ? conn : undefined),
}));

vi.mock('../../../../store', () => ({
  store: {
    getState: () => ({
      session: {
        currentRoom: {
          metadata: {
            roomFeatures: {
              endToEndEncryptionFeatures: {
                isEnabled: true,
                enabledSelfInsertEncryptionKey: false,
                encryptionKey: 'parent-secret',
              },
            },
          },
        },
      },
    }),
  },
}));

vi.mock('../../../../helpers/libs/cryptoMessages', () => ({
  deriveRoomKey: vi.fn(async (secret: string, sid: string) => ({ secret, sid })),
  // Tag the payload so the test can tell the encrypted value from the compressed one.
  encryptDataToUint8ArrayWithKey: vi.fn(async (value: Uint8Array, key: unknown) => {
    const tagged = new Uint8Array(value.length + 1);
    tagged[0] = 0xee;
    tagged.set(value, 1);
    state.encrypted.push({ value: tagged, key });
    return tagged;
  }),
}));

vi.mock('../../../whiteboard/collab', () => ({
  getWhiteboardController: () => ({
    getSnapshot: () => state.wbSnapshot,
    fetchSessionData: async (key: string) => {
      state.fetched.push(key);
      return true;
    },
  }),
}));

vi.mock('../../../whiteboard/collab/whiteboardPersistence', () => ({
  loadWhiteboardPageSnapshot: async () => state.pageSnapshot,
}));

vi.mock('../../../shared-notepad/NotepadController', () => ({
  NOTEPAD_SNAPSHOT_KEY: 'snapshot',
  getNotepadController: () => ({ getSnapshot: () => ({ doc: state.notepadDoc }) }),
}));

const { seedBreakoutContent } = await import('../breakoutRoomSeeding');

const saves = () =>
  (conn.sendMessageToCoreWorker.mock.calls as unknown as [SaveMsg][])
    .filter(([m]) => m.event === NatsMsgClientToServerEvents.SESSION_DATA_SAVE)
    .map(([m]) => ({ header: JSON.parse(m.msg) as Record<string, string>, value: m.binMsg }));

const room = { id: 'child-1', roomSid: 'sid-1' } as never;

beforeEach(() => {
  vi.clearAllMocks();
  state.connected = true;
  state.notepadDoc = null;
  state.wbSnapshot = null;
  state.fetched = [];
  state.pageSnapshot = null;
  state.encrypted = [];
});

describe('seedBreakoutContent', () => {
  it('seeds the notepad snapshot with the child-key encrypted value', async () => {
    const doc = new Y.Doc();
    doc.getText('elements').insert(0, 'hello');
    state.notepadDoc = doc;

    const result = await seedBreakoutContent({ rooms: [room], shareNotepad: true });

    expect(result.shared).toBe(1);
    const [save] = saves();
    expect(save.header).toMatchObject({
      dataType: 'SESSION_DATA_TYPE_NOTEPAD',
      key: 'snapshot',
      targetRoomId: 'child-1',
    });
    expect(save.header.requestId).toBeUndefined();
    // binMsg is the child-key encrypted wire value, not the raw gzip bytes.
    expect(state.encrypted).toHaveLength(1);
    expect(state.encrypted[0].key).toEqual({ secret: 'parent-secret', sid: 'sid-1' });
    expect(save.value).toBe(state.encrypted[0].value);
  });

  it('seeds every whiteboard page under its canonical `${fileId}_${page}` key', async () => {
    state.wbSnapshot = { doc: new Y.Doc(), fileId: 'file-1', page: 2 };
    state.pageSnapshot = new Uint8Array([1, 2, 3]);

    const result = await seedBreakoutContent({
      rooms: [room],
      whiteboardShare: { fileId: 'file-1', pages: [2, 3] } as never,
      shareNotepad: false,
    });

    expect(result.shared).toBe(1);
    const keys = saves().map((s) => s.header.key);
    expect(keys).toEqual(['file-1_2', 'file-1_3']);
    expect(saves().every((s) => s.header.targetRoomId === 'child-1')).toBe(true);
    expect(saves().every((s) => s.header.dataType === 'SESSION_DATA_TYPE_WHITEBOARD')).toBe(true);
    // Page 2 came from the live doc, so only page 3 needed a server fetch.
    expect(state.fetched).toEqual(['file-1_3']);
  });

  it('sends nothing without a NATS connection', async () => {
    state.connected = false;
    state.notepadDoc = new Y.Doc();

    const result = await seedBreakoutContent({ rooms: [room], shareNotepad: true });

    expect(result.shared).toBe(0);
    expect(saves()).toHaveLength(0);
  });
});
