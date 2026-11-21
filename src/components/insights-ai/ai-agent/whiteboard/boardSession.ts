import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/element/transform';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

import { store } from '../../../../store';
import {
  updateIsActiveSharedNotePad,
  updateIsActiveWhiteboard,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { getWhiteboardController } from '../../../whiteboard/collab';
import { WHITEBOARD_READY_PROBE_ID as READY_PROBE_ID } from '../../../whiteboard/helpers/constants';
import { getWhiteboardExcalidrawAPI } from '../../../whiteboard/helpers/liveScene';

/** The board mounts lazily, so a tool may have to wait for it to appear. */
const OPEN_TIMEOUT_MS = 10000;
const OPEN_POLL_MS = 50;
/** Background-tab fallback so a probe never hangs on a missing animation frame. */
const FRAME_FALLBACK_MS = 50;
/** A freshly opened board settles late: lazy chunks, fonts and the A4 fit. */
export const OPEN_SETTLE_MS = 2000;

/** Canvas instances that already passed the probe for a `(fileId, page)`. */
let probed: { api: ExcalidrawImperativeAPI; fileId: string; page: number } | null = null;

export const whiteboardEnabled = (): boolean =>
  !!store.getState().session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures?.isAllow;

/**
 * Whether the mounted board can be written to: the CRDT doc settled on the
 * page Redux points at and the live Excalidraw instance is wired.
 */
export const boardMounted = (): boolean => {
  const ready =
    !!getWhiteboardController().isReadyForExternalWrite() && !!getWhiteboardExcalidrawAPI();
  // A closed board keeps its probe behind: the next mount is a new canvas.
  if (!ready) {
    probed = null;
  }
  return ready;
};

/** One animation frame; headless environments have no paint to wait for. */
const nextFrame = (): Promise<void> => {
  if (typeof requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, FRAME_FALLBACK_MS);
    requestAnimationFrame(() => {
      clearTimeout(timer);
      resolve();
    });
  });
};

const withoutProbe = (api: ExcalidrawImperativeAPI) =>
  api.getSceneElementsIncludingDeleted().filter((element) => element.id !== READY_PROBE_ID);

const clearProbe = (api: ExcalidrawImperativeAPI) => {
  api.updateScene({
    elements: withoutProbe(api),
    captureUpdate: 'NEVER',
  });
};

const buildProbe = async (background: string): Promise<ExcalidrawElement | null> => {
  const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');
  const [element] = convertToExcalidrawElements(
    [
      {
        type: 'rectangle',
        id: READY_PROBE_ID,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        angle: 0,
        strokeColor: background,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 0,
        roundness: null,
        groupIds: [],
        frameId: null,
        isDeleted: false,
        locked: false,
      },
    ] as unknown as ExcalidrawElementSkeleton[],
    { regenerateIds: false },
  ) as unknown as ExcalidrawElement[];
  return element ?? null;
};

/**
 * Proves the canvas is really paint-ready: a 1×1 invisible rectangle is written
 * locally (never into the CRDT or the undo history), read back on the next
 * frame and removed again. Only a scene that accepted the element and reports a
 * measured viewport passes.
 */
export const verifyCanvasPaintReady = async (): Promise<boolean> => {
  const api = getWhiteboardExcalidrawAPI();
  const controller = getWhiteboardController();
  const snapshot = controller.getSnapshot();
  // The probe is only worth trusting for a live canvas in the current scope.
  if (!api || !snapshot || !controller.isReadyForExternalWrite()) {
    return false;
  }
  if (probed?.api === api && probed.fileId === snapshot.fileId && probed.page === snapshot.page) {
    return true;
  }

  const probe = await buildProbe(api.getAppState().viewBackgroundColor || '#ffffff');
  if (!probe) {
    return false;
  }

  api.updateScene({
    elements: [...withoutProbe(api), probe],
    captureUpdate: 'NEVER',
  });
  await nextFrame();

  const scene = api.getSceneElements();
  const appState = api.getAppState();
  const accepted = scene.some((element) => element.id === READY_PROBE_ID);
  const measured =
    (appState.width ?? 0) > 0 && (appState.height ?? 0) > 0 && (appState.zoom?.value ?? 0) > 0;
  clearProbe(api);

  if (!accepted || !measured) {
    return false;
  }
  probed = { api, fileId: snapshot.fileId, page: snapshot.page };
  return true;
};

const waitForCanvas = async (): Promise<boolean> => {
  const deadline = Date.now() + OPEN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (boardMounted() && (await verifyCanvasPaintReady())) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, OPEN_POLL_MS));
  }
  return false;
};

/** Waits out whatever is left of the settle window of a just-opened board. */
const settleOpen = async (openedAt: number): Promise<void> => {
  const remaining = OPEN_SETTLE_MS - (Date.now() - openedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
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
  // A board that has to be opened keeps moving after the canvas exists.
  const wasActive = store.getState().bottomIconsActivity.isActiveWhiteboard;
  const openedAt = Date.now();
  if (!wasActive) {
    store.dispatch(updateIsActiveWhiteboard(true));
  }

  // A closed board can leave a stale snapshot behind: only a canvas that passed
  // the paint probe may be written to.
  const ready = await waitForCanvas();
  if (!ready) {
    return 'The whiteboard is not open on this device right now.';
  }

  if (!wasActive) {
    await settleOpen(openedAt);
    // The canvas may have been remounted or re-scoped while it settled.
    if (!boardMounted() || !(await verifyCanvasPaintReady())) {
      return 'The whiteboard is not open on this device right now.';
    }
  }
  return null;
};
