import { store } from '../../../../store';
import {
  updateIsActiveSharedNotePad,
  updateIsActiveWhiteboard,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { getWhiteboardController } from '../../../whiteboard/collab';

/** The board mounts lazily, so a tool may have to wait for it to appear. */
const OPEN_TIMEOUT_MS = 8000;
const OPEN_POLL_MS = 60;

export const whiteboardEnabled = (): boolean =>
  !!store.getState().session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures?.isAllow;

/**
 * `<Excalidraw>` publishes its API before `WhiteboardController.sync()` builds
 * the CRDT document, so only the snapshot proves the board can be written to.
 */
export const boardMounted = (): boolean => !!getWhiteboardController().getSnapshot();

const waitForBoard = async (): Promise<void> => {
  const deadline = Date.now() + OPEN_TIMEOUT_MS;
  while (!boardMounted() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, OPEN_POLL_MS));
  }
};

/**
 * Brings the whiteboard up on this client. The floating shared notepad is closed
 * in the same step: only one surface stays open, so the participant looks at
 * what the agent is drawing on. Returns the reason it cannot be opened.
 */
export const ensureWhiteboardSurface = async (): Promise<string | null> => {
  if (!whiteboardEnabled()) {
    return 'The whiteboard is not enabled in this room.';
  }

  if (store.getState().bottomIconsActivity.isActiveSharedNotePad) {
    store.dispatch(updateIsActiveSharedNotePad(false));
  }
  if (!store.getState().bottomIconsActivity.isActiveWhiteboard) {
    store.dispatch(updateIsActiveWhiteboard(true));
  }

  await waitForBoard();
  return null;
};
