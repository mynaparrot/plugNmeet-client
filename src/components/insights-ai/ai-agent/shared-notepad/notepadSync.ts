import { create, toJsonString } from '@bufbuild/protobuf';
import {
  AIAgentWhiteboardSceneMsgSchema,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
} from 'plugnmeet-protocol-js';

import { getNatsConn } from '../../../../helpers/nats';
import { store } from '../../../../store';
import { aiAgentSelector } from '../../../../store/slices/aiAgentSlice';
import {
  getNotepadController,
  type NotepadContentSnapshot,
} from '../../../shared-notepad/NotepadController';

/** Notepad snapshots travel on the whiteboard scene channel under a pseudo file id. */
export const NOTEPAD_SCENE_FILE_ID = 'shared_notepad';
export const NOTEPAD_SCENE_PAGE = 0;

const DEBOUNCE_MS = 1500;
/** Hard floor between two automatic pushes, whatever the debounce says. */
const MIN_PUSH_INTERVAL_MS = 4000;

export type NotepadSceneElement = {
  id: string;
  type: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  author: 'agent' | 'participant';
  trust: 'agent' | 'untrusted_notepad_content';
};

export type NotepadSceneGraph = {
  board: { file_id: string; page: number };
  counts: { total: number; participant: number; agent: number };
  elements: NotepadSceneElement[];
};

/**
 * Shapes the notepad like a scene graph so the server's existing authorship
 * framing works unchanged. A participant edit of an agent line keeps the agent
 * prompt visible, which is what the correction is about.
 */
export const buildNotepadSceneGraph = (content: NotepadContentSnapshot): NotepadSceneGraph => {
  const elements = content.blocks.map((block, index) => {
    const author = block.author === 'external' ? 'agent' : 'participant';
    return {
      id: block.id,
      type: block.type,
      text: block.originalText
        ? `${block.text} (edited from your prompt: "${block.originalText}")`
        : block.text,
      x: 0,
      y: index,
      width: 0,
      height: 0,
      author,
      trust: author === 'agent' ? 'agent' : 'untrusted_notepad_content',
    } as NotepadSceneElement;
  });

  return {
    board: { file_id: NOTEPAD_SCENE_FILE_ID, page: NOTEPAD_SCENE_PAGE },
    counts: {
      total: elements.length,
      participant: elements.filter((element) => element.author === 'participant').length,
      agent: elements.filter((element) => element.author === 'agent').length,
    },
    elements,
  };
};

const sendScene = (reason: string, content: NotepadContentSnapshot): boolean => {
  const conn = getNatsConn();
  if (!conn) {
    return false;
  }

  const scene = buildNotepadSceneGraph(content);
  const message = create(AIAgentWhiteboardSceneMsgSchema, {
    roomId: store.getState().session.currentRoom.roomId,
    fileId: NOTEPAD_SCENE_FILE_ID,
    page: NOTEPAD_SCENE_PAGE,
    reason,
    webpImage: new Uint8Array(),
    sceneGraphJson: JSON.stringify(scene),
    capturedAtMs: String(Date.now()),
    participantElementIds: content.participantBlocks.map((block) => block.id),
    agentElementIds: content.externalBlocks.map((block) => block.id),
  });

  void conn.sendMessageToSystemWorker(
    create(NatsMsgClientToServerSchema, {
      event: NatsMsgClientToServerEvents.AI_AGENT_WHITEBOARD_SCENE,
      msg: toJsonString(AIAgentWhiteboardSceneMsgSchema, message),
    }),
  );
  return true;
};

/** Pushes the current notepad content once, if the delegate can read it. */
export const pushNotepadScene = (reason: string): boolean => {
  const content = getNotepadController().readContent();
  return content ? sendScene(reason, content) : false;
};

const roomFeatures = () => store.getState().session.currentRoom.metadata?.roomFeatures;

/** Pushes only while an agent session is live and the room allows a notepad. */
const syncAllowed = (): boolean => {
  const features = roomFeatures()?.insightsFeatures?.aiAgentFeatures;
  if (!features?.isAllow || !roomFeatures()?.sharedNotePadFeatures?.isAllow) {
    return false;
  }
  return !!aiAgentSelector(store.getState());
};

let timer: ReturnType<typeof setTimeout> | null = null;
let lastPushAt = 0;
let stopListener: (() => void) | null = null;

const cancelTimer = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
};

const flush = (reason: string) => {
  timer = null;
  if (!syncAllowed()) {
    return;
  }

  const wait = MIN_PUSH_INTERVAL_MS - (Date.now() - lastPushAt);
  if (wait > 0) {
    // Rate limited: keep the reason and push as soon as the floor allows.
    timer = setTimeout(() => flush(reason), wait);
    return;
  }

  if (pushNotepadScene(reason)) {
    lastPushAt = Date.now();
  }
};

/**
 * Trailing-debounce schedule for a participant edit. A push that would break
 * the 4 s floor is deferred instead of dropped, so the model still sees the
 * final state of a burst of typing.
 */
export const notifyNotepadParticipantEdit = (reason = 'notepad_participant_edit') => {
  if (!syncAllowed()) {
    return;
  }
  cancelTimer();
  timer = setTimeout(() => flush(reason), DEBOUNCE_MS);
};

/** Starts the automatic notepad loop. Idempotent and inert unless an agent is live. */
export const initNotepadAgentSync = () => {
  if (stopListener) {
    return;
  }
  stopListener = getNotepadController().onParticipantContentChange(() =>
    notifyNotepadParticipantEdit('notepad_participant_edit'),
  );
};

export const stopNotepadAgentSync = () => {
  cancelTimer();
  stopListener?.();
  stopListener = null;
  // A restarted loop starts with a clean rate-limit window.
  lastPushAt = 0;
};
