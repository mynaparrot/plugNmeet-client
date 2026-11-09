import type * as Y from 'yjs';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

/**
 * Immutable snapshot of the active CRDT whiteboard session. A fresh object
 * reference is produced on every `emitChange()` so callers can detect changes.
 */
export type WhiteboardYjsSnapshot = {
  doc: Y.Doc;
  elementsMap: Y.Map<string>;
  generation: number;
  roomSid: string;
  fileId: string;
  page: number;
};

/** Parsed scope metadata carried in whiteboard sync/update messages. */
export interface WhiteboardScope {
  fileId?: string;
  page?: number;
  stateVector?: string;
  initial_data?: string;
  /** binMessage is gzip-compressed (full-state payloads only; live edits and diffs stay raw). */
  gzip?: boolean;
}

export type WhiteboardControllerConfig = {
  excalidrawAPI: ExcalidrawImperativeAPI;
  roomSid: string;
  onRemoteUpdate: () => void;
  canWrite: () => boolean;
};

/**
 * JSON-serializable presence payload broadcast through Yjs Awareness and
 * rendered as collaborator cursors on the canvas. Room-scoped, so it survives
 * whiteboard page/file switches.
 */
export interface WhiteboardPresence {
  id: string;
  username?: string;
  avatarUrl?: string;
  pointer?: {
    x: number;
    y: number;
    tool: string;
  };
  button?: 'up' | 'down';
  selectedElementIds?: Record<string, boolean>;
}
