import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The vision loop decides *when* the agent sees the board: a trailing debounce
 * per participant edit, a hard floor between pushes, and no push at all while
 * the agent is drawing.
 */

const hoisted = vi.hoisted(() => ({
  roomState: { current: {} as Record<string, unknown> },
  capture: vi.fn(async () => ({}) as unknown),
  subscribers: [] as (() => void)[],
  controller: {
    listener: null as null | (() => void),
    onParticipantSceneChange: vi.fn((listener: () => void) => {
      hoisted.controller.listener = listener;
      return () => {
        hoisted.controller.listener = null;
      };
    }),
  },
}));

const { roomState, capture, controller, subscribers } = hoisted;

const buildState = (over: { allowVisionCapture?: boolean } = {}) => ({
  session: {
    currentUser: { userId: 'me' },
    currentRoom: {
      metadata: {
        roomFeatures: {
          whiteboardFeatures: { isAllow: true },
          insightsFeatures: {
            aiAgentFeatures: {
              isAllow: true,
              allowVisionCapture: over.allowVisionCapture !== false,
              visionDebounceMs: 1200,
            },
          },
        },
      },
    },
  },
  whiteboard: { currentPage: 1, currentWhiteboardOfficeFileId: 'default' },
  aiAgent: { agent: { sessionId: 'session-1' } },
});

vi.mock('../../../../store', () => ({
  store: {
    getState: () => hoisted.roomState.current,
    dispatch: vi.fn(),
    subscribe: (listener: () => void) => {
      hoisted.subscribers.push(listener);
      return () => undefined;
    },
  },
}));

vi.mock('../../../../helpers/nats', () => ({ getNatsConn: () => undefined }));

vi.mock('../../../whiteboard/collab', () => ({
  getWhiteboardController: () => hoisted.controller,
}));

vi.mock('../whiteboard/snapshotCapture', () => ({
  captureWhiteboardSnapshot: hoisted.capture,
}));

import {
  beginAgentWhiteboardTool,
  endAgentWhiteboardTool,
  initWhiteboardVisionSync,
  notifyWhiteboardSceneChanged,
  stopWhiteboardVisionSync,
} from '../whiteboard/useVisionSync';

const edit = () => controller.listener?.();

beforeEach(() => {
  vi.clearAllMocks();
  roomState.current = buildState();
  subscribers.length = 0;
  vi.useFakeTimers();
  initWhiteboardVisionSync();
});

afterEach(() => {
  stopWhiteboardVisionSync();
  vi.useRealTimers();
});

describe('whiteboard vision loop', () => {
  it('debounces a participant edit before pushing', () => {
    edit();
    vi.advanceTimersByTime(1000);
    expect(capture).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(capture).toHaveBeenCalledWith('participant_edit');
  });

  it('coalesces a burst of edits into one push', () => {
    edit();
    vi.advanceTimersByTime(600);
    edit();
    vi.advanceTimersByTime(1300);

    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('keeps a 4 s floor between automatic pushes', () => {
    edit();
    vi.advanceTimersByTime(1300);
    expect(capture).toHaveBeenCalledTimes(1);

    // Second edit immediately after: deferred, not dropped.
    edit();
    vi.advanceTimersByTime(1300);
    expect(capture).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(4000);
    expect(capture).toHaveBeenCalledTimes(2);
  });

  it('never pushes while an agent tool is drawing', () => {
    beginAgentWhiteboardTool();
    edit();
    vi.advanceTimersByTime(5000);
    expect(capture).not.toHaveBeenCalled();

    endAgentWhiteboardTool();
    edit();
    vi.advanceTimersByTime(1300);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending push when the agent starts drawing', () => {
    edit();
    vi.advanceTimersByTime(600);
    beginAgentWhiteboardTool();
    vi.advanceTimersByTime(5000);

    expect(capture).not.toHaveBeenCalled();
    endAgentWhiteboardTool();
  });

  it('pushes immediately-ish on a page change', () => {
    roomState.current = {
      ...buildState(),
      whiteboard: { currentPage: 2, currentWhiteboardOfficeFileId: 'default' },
    };
    for (const subscriber of subscribers) {
      subscriber();
    }
    vi.advanceTimersByTime(1300);

    expect(capture).toHaveBeenCalledWith('page_change');
  });

  it('stays inert when the room disables vision capture', () => {
    roomState.current = buildState({ allowVisionCapture: false });
    notifyWhiteboardSceneChanged('participant_edit');
    vi.advanceTimersByTime(10000);

    expect(capture).not.toHaveBeenCalled();
  });

  it('stays inert while no agent session is live', () => {
    roomState.current = { ...buildState(), aiAgent: { agent: null } };
    notifyWhiteboardSceneChanged('participant_edit');
    vi.advanceTimersByTime(10000);

    expect(capture).not.toHaveBeenCalled();
  });
});
