import type * as Y from 'yjs';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

/**
 * Immutable snapshot of the active CRDT whiteboard session. Consumed via
 * `useSyncExternalStore`; a fresh object reference must be produced on every
 * `emitChange()` so React knows the state changed.
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
}

export type WhiteboardControllerConfig = {
  excalidrawAPI: ExcalidrawImperativeAPI;
  roomSid: string;
  onRemoteUpdate: () => void;
  canWrite: () => boolean;
  isPrimaryResponder?: () => boolean;
};
