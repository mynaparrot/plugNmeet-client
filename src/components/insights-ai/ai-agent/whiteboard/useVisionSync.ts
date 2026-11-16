import { store } from '../../../../store';
import { aiAgentSelector } from '../../../../store/slices/aiAgentSlice';
import { getWhiteboardController } from '../../../whiteboard/collab';
import { captureWhiteboardSnapshot } from './snapshotCapture';

const DEFAULT_DEBOUNCE_MS = 1200;
const MIN_DEBOUNCE_MS = 400;
const MAX_DEBOUNCE_MS = 5000;
/** Hard floor between two automatic pushes, whatever the debounce says. */
const MIN_PUSH_INTERVAL_MS = 4000;

let timer: ReturnType<typeof setTimeout> | null = null;
let lastPushAt = 0;
// Depth of agent drawing tools in flight: their ink must never feed back into
// the model as participant input.
let toolDepth = 0;
let stopSceneListener: (() => void) | null = null;
let stopStoreListener: (() => void) | null = null;
let lastScope = '';

const agentFeatures = () =>
  store.getState().session.currentRoom.metadata?.roomFeatures?.insightsFeatures?.aiAgentFeatures;

const clampDebounce = (value: unknown): number => {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) {
    return DEFAULT_DEBOUNCE_MS;
  }
  return Math.min(MAX_DEBOUNCE_MS, Math.max(MIN_DEBOUNCE_MS, Math.round(ms)));
};

/** Pushes only while an agent session is live and the host allowed vision. */
const visionAllowed = (): boolean => {
  const features = agentFeatures();
  if (!features?.isAllow || features.allowVisionCapture === false) {
    return false;
  }
  return !!aiAgentSelector(store.getState());
};

const cancelTimer = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
};

/** Drops a push that has not been sent yet (an agent tool is about to draw). */
export const cancelPendingWhiteboardVisionPush = () => cancelTimer();

const flush = (reason: string) => {
  timer = null;
  if (toolDepth > 0 || !visionAllowed()) {
    return;
  }

  const now = Date.now();
  const wait = MIN_PUSH_INTERVAL_MS - (now - lastPushAt);
  if (wait > 0) {
    // Rate limited: keep the reason and push as soon as the floor allows.
    timer = setTimeout(() => flush(reason), wait);
    return;
  }

  lastPushAt = now;
  void captureWhiteboardSnapshot(reason);
};

/**
 * Trailing-debounce schedule for a participant edit. A push that would break
 * the 4 s floor is deferred instead of dropped, so the model still gets the
 * final state of a burst.
 */
export const notifyWhiteboardSceneChanged = (reason = 'participant_edit') => {
  if (toolDepth > 0 || !visionAllowed()) {
    return;
  }
  cancelTimer();
  timer = setTimeout(() => flush(reason), clampDebounce(agentFeatures()?.visionDebounceMs));
};

export const beginAgentWhiteboardTool = () => {
  toolDepth++;
  cancelTimer();
};

export const endAgentWhiteboardTool = () => {
  toolDepth = Math.max(0, toolDepth - 1);
};

const currentScope = (): string => {
  const whiteboard = store.getState().whiteboard;
  return `${whiteboard?.currentWhiteboardOfficeFileId ?? ''}:${whiteboard?.currentPage ?? 0}`;
};

/**
 * Starts the automatic vision loop: debounced participant edits plus an
 * immediate push on a page/file switch. Idempotent, and inert unless an agent
 * session is live and the room allows vision capture.
 */
export const initWhiteboardVisionSync = () => {
  if (stopSceneListener) {
    return;
  }

  stopSceneListener = getWhiteboardController().onParticipantSceneChange(() =>
    notifyWhiteboardSceneChanged('participant_edit'),
  );
  lastScope = currentScope();
  stopStoreListener = store.subscribe(() => {
    const scope = currentScope();
    if (scope === lastScope) {
      return;
    }
    lastScope = scope;
    notifyWhiteboardSceneChanged('page_change');
  });
};

export const stopWhiteboardVisionSync = () => {
  cancelTimer();
  stopSceneListener?.();
  stopSceneListener = null;
  stopStoreListener?.();
  stopStoreListener = null;
  toolDepth = 0;
  // A restarted loop starts with a clean rate-limit window.
  lastPushAt = 0;
  lastScope = '';
};
