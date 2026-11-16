import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The notepad loop decides *when* the agent hears about a participant edit: a
 * trailing debounce per edit, a hard floor between pushes, and silence while no
 * agent session is live.
 */

const hoisted = vi.hoisted(() => ({
  roomState: { current: {} as Record<string, unknown> },
  conn: { sendMessageToSystemWorker: vi.fn(async () => undefined) },
  controller: {
    listener: null as null | (() => void),
    content: null as unknown,
    onParticipantContentChange: vi.fn((listener: () => void) => {
      hoisted.controller.listener = listener;
      return () => {
        hoisted.controller.listener = null;
      };
    }),
    readContent: vi.fn(() => hoisted.controller.content),
  },
}));

const { roomState, conn, controller } = hoisted;

const block = (over: Record<string, unknown>) => ({
  id: 'b1',
  type: 'paragraph',
  text: 'text',
  markdown: 'text',
  author: 'participant',
  ...over,
});

const snapshot = {
  markdown: '# Notes',
  blocks: [
    block({ id: 'b1', text: '1. I ___ (go)', author: 'external' }),
    block({ id: 'b2', text: '1. I went', author: 'participant', originalText: '1. I ___ (go)' }),
  ],
  externalBlocks: [block({ id: 'b1', text: '1. I ___ (go)', author: 'external' })],
  participantBlocks: [
    block({ id: 'b2', text: '1. I went', author: 'participant', originalText: '1. I ___ (go)' }),
  ],
};

const buildState = ({ agent = true, notepadAllow = true } = {}) => ({
  session: {
    currentUser: { userId: 'me' },
    currentRoom: {
      roomId: 'room-1',
      metadata: {
        roomFeatures: {
          sharedNotePadFeatures: { isAllow: notepadAllow, isActive: true },
          insightsFeatures: { aiAgentFeatures: { isAllow: true } },
        },
      },
    },
  },
  aiAgent: { agent: agent ? { sessionId: 'session-1' } : null },
});

vi.mock('../../../../store', () => ({
  store: {
    getState: () => hoisted.roomState.current,
    dispatch: vi.fn(),
    subscribe: () => () => undefined,
  },
}));

vi.mock('../../../../helpers/nats', () => ({ getNatsConn: () => hoisted.conn }));

vi.mock('../../../shared-notepad/NotepadController', () => ({
  getNotepadController: () => hoisted.controller,
}));

import {
  initNotepadAgentSync,
  notifyNotepadParticipantEdit,
  pushNotepadScene,
  stopNotepadAgentSync,
} from '../shared-notepad/notepadSync';

const edit = () => controller.listener?.();

const sentMessage = () =>
  JSON.parse(
    (
      conn.sendMessageToSystemWorker.mock.calls as unknown as [{ msg: string; event: number }][]
    )[0][0].msg,
  ) as {
    event: number;
    fileId: string;
    page: number;
    reason: string;
    sceneGraphJson: string;
  };

beforeEach(() => {
  vi.clearAllMocks();
  roomState.current = buildState();
  controller.content = snapshot;
  vi.useFakeTimers();
  initNotepadAgentSync();
});

afterEach(() => {
  stopNotepadAgentSync();
  vi.useRealTimers();
});

describe('notepad agent sync', () => {
  it('debounces a participant edit before pushing', () => {
    edit();
    vi.advanceTimersByTime(1000);
    expect(conn.sendMessageToSystemWorker).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    expect(conn.sendMessageToSystemWorker).toHaveBeenCalledTimes(1);
  });

  it('coalesces a burst of edits into one push', () => {
    edit();
    vi.advanceTimersByTime(600);
    edit();
    vi.advanceTimersByTime(1600);

    expect(conn.sendMessageToSystemWorker).toHaveBeenCalledTimes(1);
  });

  it('keeps a 4 s floor between automatic pushes', () => {
    edit();
    vi.advanceTimersByTime(1600);
    expect(conn.sendMessageToSystemWorker).toHaveBeenCalledTimes(1);

    // Second edit right after the push: deferred, not dropped.
    edit();
    vi.advanceTimersByTime(1600);
    expect(conn.sendMessageToSystemWorker).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(4000);
    expect(conn.sendMessageToSystemWorker).toHaveBeenCalledTimes(2);
  });

  it('pushes the notepad on the whiteboard scene channel', () => {
    edit();
    vi.advanceTimersByTime(1600);

    const message = sentMessage();
    // page defaults to 0, so protojson leaves it out of the wire message.
    expect(message).toMatchObject({
      fileId: 'shared_notepad',
      reason: 'notepad_participant_edit',
    });

    const scene = JSON.parse(message.sceneGraphJson) as {
      board: { file_id: string; page: number };
      counts: { total: number; participant: number; agent: number };
      elements: { id: string; text: string; author: string; y: number }[];
    };
    expect(scene.board).toEqual({ file_id: 'shared_notepad', page: 0 });
    expect(scene.counts).toEqual({ total: 2, participant: 1, agent: 1 });
    expect(scene.elements[1]).toMatchObject({
      id: 'b2',
      author: 'participant',
      y: 1,
      text: '1. I went (edited from your prompt: "1. I ___ (go)")',
    });
  });

  it('stays inert while no agent session is live', () => {
    roomState.current = buildState({ agent: false });
    notifyNotepadParticipantEdit();
    vi.advanceTimersByTime(10000);

    expect(conn.sendMessageToSystemWorker).not.toHaveBeenCalled();
  });

  it('stays inert when the room does not allow the notepad', () => {
    roomState.current = buildState({ notepadAllow: false });
    notifyNotepadParticipantEdit();
    vi.advanceTimersByTime(10000);

    expect(conn.sendMessageToSystemWorker).not.toHaveBeenCalled();
  });

  it('does not push when the notepad has no readable content', () => {
    controller.content = null;

    expect(pushNotepadScene('notepad_read')).toBe(false);
    expect(conn.sendMessageToSystemWorker).not.toHaveBeenCalled();
  });
});
