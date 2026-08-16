import type { DataMsgBodyType } from 'plugnmeet-protocol-js';
import type * as Y from 'yjs';

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

/**
 * Transport callback used for all outbound CRDT traffic (wired to NATS by the
 * host, dormant in M1). `id` carries the sync request id which responders echo
 * back; `message` optionally carries JSON metadata (e.g. the responder's state
 * vector during the state-vector sync handshake).
 */
export type WhiteboardTransport = (
  type: DataMsgBodyType,
  binMessage: Uint8Array,
  id?: string,
  message?: string,
) => void;

export type WhiteboardControllerConfig = {
  roomSid: string;
  send: WhiteboardTransport;
  canWrite: () => boolean;
  isPrimaryResponder?: () => boolean;
};

/** Composite key for a whiteboard page inside the persistence layer. */
export type WhiteboardPageKey = `${string}_${number}`;

export const makeWhiteboardPageKey = (
  fileId: string,
  page: number,
): WhiteboardPageKey => `${fileId}_${page}`;
