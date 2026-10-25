import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';
import type { DataChannelMessage } from 'plugnmeet-protocol-js';

/*
 * PAGE_CHANGE / FILE_CHANGE are presenter-only: a non-presenter sender must
 * never move everyone else's whiteboard.
 */

const { state, dispatch } = vi.hoisted(() => ({
  state: { current: {} as Record<string, unknown> },
  dispatch: vi.fn(),
}));

vi.mock('../../../store', () => ({ store: { getState: () => state.current, dispatch } }));

vi.mock('../../../components/whiteboard/collab', () => ({
  getWhiteboardController: () => ({ handleMessage: vi.fn() }),
}));

vi.mock('../../../store/slices/participantSlice', () => ({
  participantsSelector: { selectAll: (s: { participants: unknown[] }) => s.participants },
}));

vi.mock('../../../store/slices/whiteboard', () => ({
  setWhiteboardCurrentPage: (page: number) => ({ type: 'set-page', page }),
  updateCurrentWhiteboardOfficeFileId: (payload: unknown) => ({ type: 'set-file', payload }),
  updateCurrentOfficeFilePages: (payload: string) => ({ type: 'set-pages', payload }),
  updateMouseAppStateChanges: (payload: unknown) => ({ type: 'set-app-state', payload }),
}));

import HandleWhiteboard from '../HandleWhiteboard';

const setStoreState = (presenterIds: string[]) => {
  state.current = {
    session: { currentUser: { userId: 'me', metadata: {} } },
    participants: ['me', 'peer1', 'peer2'].map((userId) => ({
      userId,
      isOnline: true,
      metadata: { isPresenter: presenterIds.includes(userId) },
    })),
  };
};

const msg = (type: DataMsgBodyType, fromUserId: string, message: string) =>
  ({ type, fromUserId, message }) as DataChannelMessage;

const handler = new HandleWhiteboard();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('presenter-only page/file changes', () => {
  it('ignores PAGE_CHANGE from a non-presenter', async () => {
    setStoreState(['peer2']);
    await handler.handleWhiteboardMsg(msg(DataMsgBodyType.PAGE_CHANGE, 'peer1', '3'));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('applies PAGE_CHANGE from the presenter', async () => {
    setStoreState(['peer1']);
    await handler.handleWhiteboardMsg(msg(DataMsgBodyType.PAGE_CHANGE, 'peer1', '3'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'set-page', page: 3 });
  });

  it('ignores FILE_CHANGE from a non-presenter and applies the presenter one', async () => {
    setStoreState(['peer1']);
    const payload = JSON.stringify({ fileId: 'file2', page: 1 });

    await handler.handleWhiteboardMsg(msg(DataMsgBodyType.FILE_CHANGE, 'peer2', payload));
    expect(dispatch).not.toHaveBeenCalled();

    await handler.handleWhiteboardMsg(msg(DataMsgBodyType.FILE_CHANGE, 'peer1', payload));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'set-file',
      payload: { fileId: 'file2', page: 1 },
    });
  });
});
