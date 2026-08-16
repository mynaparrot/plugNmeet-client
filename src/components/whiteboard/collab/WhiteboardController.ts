import * as Y from 'yjs';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import { getNatsConn } from '../../../helpers/nats';
import {
  loadWhiteboardPageSnapshot,
  saveWhiteboardPageSnapshot,
} from './whiteboardPersistence';
import type {
  WhiteboardControllerConfig,
  WhiteboardYjsSnapshot,
} from './types';

export const WHITEBOARD_REMOTE_ORIGIN = 'whiteboard-remote';
export const WHITEBOARD_ELEMENTS_MAP = 'elements';
const SYNC_RETRY_DELAY_MS = 2000;
const MAX_SYNC_REQUEST_ATTEMPTS = 3;
const SAVE_DEBOUNCE_MS = 1000;

/**
 * Decode a persisted yjs state snapshot (as written by
 * `saveWhiteboardPageSnapshot`) back into the Excalidraw elements stored in
 * the `WHITEBOARD_ELEMENTS_MAP` map. Malformed snapshots yield an empty array
 * rather than throwing.
 */
export const decodeWhiteboardPageSnapshot = (
  update: Uint8Array,
): ExcalidrawElement[] => {
  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, update);
  } catch (e) {
    console.error('[WhiteboardController] failed to decode page snapshot', e);
    return [];
  }
  const elementsMap = doc.getMap<string>(WHITEBOARD_ELEMENTS_MAP);
  const elements: ExcalidrawElement[] = [];
  elementsMap.forEach((serialized) => {
    try {
      elements.push(JSON.parse(serialized) as ExcalidrawElement);
    } catch {
      // skip malformed entries
    }
  });
  return elements;
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Singleton controller owning the active yjs CRDT whiteboard session for the
 * current page. Mirrors `NotepadController` (state-vector sync handshake with
 * randomized backup responders, `useSyncExternalStore` snapshot shape,
 * `REMOTE_ORIGIN` sentinel, base64 helpers, generation counter, teardown).
 * Wired into the UI (index.tsx), NATS routing (HandleWhiteboard.ts) and
 * IndexedDB persistence (helpers/libs/idb.ts).
 */
export class WhiteboardController {
  private doc: Y.Doc | null = null;
  private elementsMap: Y.Map<string> | null = null;
  private roomSid = '';
  private fileId = '';
  private page = 0;
  private generation = 0;
  private config: WhiteboardControllerConfig | null = null;
  private pendingSyncRequestId: string | null = null;
  private syncRequestAttempts = 0;
  private backupResponseTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private syncRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  private listeners = new Set<() => void>();
  private snapshot: WhiteboardYjsSnapshot | null = null;

  /**
   * Serializes concurrent `sync()` calls so page/file changes that fire in
   * quick succession never interleave teardown/hydration of the CRDT doc.
   */
  private syncChain: Promise<void> = Promise.resolve();

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getSnapshot = (): WhiteboardYjsSnapshot | null => this.snapshot;

  /** Build a fresh snapshot object (new reference) and notify subscribers. */
  private emitChange = () => {
    if (this.doc && this.elementsMap) {
      this.snapshot = {
        doc: this.doc,
        elementsMap: this.elementsMap,
        generation: this.generation,
        roomSid: this.roomSid,
        fileId: this.fileId,
        page: this.page,
      };
    } else {
      this.snapshot = null;
    }
    this.listeners.forEach((cb) => cb());
  };

  configure = (config: WhiteboardControllerConfig) => {
    this.config = config;
  };

  /**
   * Point the controller at a specific whiteboard page and start syncing it.
   * No-op when no config was provided or the requested page is already the
   * active session. Otherwise tears down the previous session (flushing the
   * pending save), hydrates from IndexedDB, registers the update broadcaster
   * and kicks off the state-vector sync request.
   */
  sync = (
    fileId: string,
    page: number,
    options?: { hydrate?: boolean },
  ): Promise<void> => {
    const hydrate = options?.hydrate ?? true;
    this.syncChain = this.syncChain.then(() =>
      this.doSync(fileId, page, hydrate),
    );
    return this.syncChain;
  };

  private doSync = async (fileId: string, page: number, hydrate: boolean) => {
    const config = this.config;
    if (!config) {
      return;
    }
    if (
      this.doc &&
      this.fileId === fileId &&
      this.page === page &&
      this.roomSid === config.roomSid
    ) {
      return;
    }

    await this.teardownDoc();

    const doc = new Y.Doc();
    const elementsMap = doc.getMap<string>(WHITEBOARD_ELEMENTS_MAP);

    if (hydrate) {
      // Hydrate from persistence BEFORE registering the update broadcaster so
      // the loaded update is neither re-broadcast nor re-persisted.
      try {
        const stored = await loadWhiteboardPageSnapshot(fileId, page);
        if (stored && stored.length > 0) {
          Y.applyUpdate(doc, stored, WHITEBOARD_REMOTE_ORIGIN);
        }
      } catch (e) {
        console.error('[WhiteboardController] failed to load page', e);
      }
    }

    this.doc = doc;
    this.elementsMap = elementsMap;
    this.roomSid = config.roomSid;
    this.fileId = fileId;
    this.page = page;

    doc.on('update', this.handleDocUpdate);

    this.generation++;
    this.emitChange();
    this.syncRequestAttempts = 0;
    this.sendSyncRequest();
  };

  /** Flush the pending save, destroy the doc and reset all session fields. */
  teardown = async () => {
    await this.teardownDoc();
    this.generation++;
    this.emitChange();
  };

  /** `teardown()` plus forget the transport/config entirely. */
  destroy = async () => {
    await this.teardown();
    this.config = null;
  };

  saveNow = async () => {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const { doc, elementsMap, fileId } = this;
    if (!this.config || !doc || !elementsMap || !fileId) {
      return;
    }
    try {
      const update = Y.encodeStateAsUpdate(doc);
      await saveWhiteboardPageSnapshot(fileId, this.page, update);
    } catch (e) {
      console.error('[WhiteboardController] failed to save page', e);
    }
  };

  /**
   * Write local (already reconciled) Excalidraw elements into the CRDT.
   * Deleted elements are stored as `isDeleted: true` tombstones - we never
   * call `elementsMap.delete()`.
   *
   * Change detection: we compare the full serialized JSON string instead of
   * parsing and diffing individual fields. A single string comparison is the
   * cheaper correct approach: any semantic change to `id`, `version`,
   * `versionNonce`, `updated` or `isDeleted` necessarily changes the JSON, and
   * Excalidraw serializes a given element state deterministically, so an
   * identical string guarantees nothing changed.
   */
  syncLocalElements = (elements: readonly ExcalidrawElement[]) => {
    const { doc, elementsMap } = this;
    if (!doc || !elementsMap) {
      return;
    }
    doc.transact(() => {
      for (const element of elements) {
        const serialized = JSON.stringify(element);
        if (elementsMap.get(element.id) === serialized) {
          continue;
        }
        elementsMap.set(element.id, serialized);
      }
    });
  };

  /** Read all elements stored in the CRDT map (including tombstones). */
  getElements = (): ExcalidrawElement[] => {
    const { elementsMap } = this;
    if (!elementsMap) {
      return [];
    }
    const elements: ExcalidrawElement[] = [];
    elementsMap.forEach((serialized) => {
      try {
        elements.push(JSON.parse(serialized) as ExcalidrawElement);
      } catch {
        // Skip malformed entries.
      }
    });
    return elements;
  };

  /**
   * Mark every element as a tombstone (`isDeleted: true`, `updated` bumped,
   * id/version preserved). Never uses `elementsMap.clear()`/`delete()`.
   */
  clearElements = () => {
    const { doc, elementsMap } = this;
    if (!doc || !elementsMap) {
      return;
    }
    const now = Date.now();
    doc.transact(() => {
      elementsMap.forEach((serialized, id) => {
        let element: Record<string, unknown>;
        try {
          element = JSON.parse(serialized) as Record<string, unknown>;
        } catch {
          element = { id };
        }
        element.isDeleted = true;
        element.updated = now;
        elementsMap.set(id, JSON.stringify(element));
      });
    });
  };

  /**
   * Tag every outbound yjs message with the `(fileId, page)` scope so peers
   * can drop messages belonging to a different active page.
   */
  private buildScopeMessage = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({ fileId: this.fileId, page: this.page, ...extra });

  private parseScope = (
    message?: string,
  ): { fileId?: string; page?: number; stateVector?: string } | null => {
    if (!message) return null;
    try {
      return JSON.parse(message) as {
        fileId?: string;
        page?: number;
        stateVector?: string;
      };
    } catch {
      return null;
    }
  };

  private matchesActiveScope = (
    scope: { fileId?: string; page?: number } | null,
  ): boolean =>
    !!scope &&
    !!this.doc &&
    scope.fileId === this.fileId &&
    scope.page === this.page;

  handleMessage = (
    type: DataMsgBodyType,
    binMessage: Uint8Array | undefined,
    fromUserId: string,
    id?: string,
    message?: string,
  ) => {
    const conn = getNatsConn();
    if (!conn || fromUserId === conn.userId) {
      return;
    }
    if (!binMessage || binMessage.length === 0) {
      return;
    }
    switch (type) {
      case DataMsgBodyType.SCENE_UPDATE: {
        const scope = this.parseScope(message);
        if (this.matchesActiveScope(scope)) {
          this.applyRemoteUpdate(binMessage);
        }
        break;
      }
      case DataMsgBodyType.REQ_FULL_WHITEBOARD_DATA:
        this.handleSyncRequest(binMessage, fromUserId, id, message);
        break;
      case DataMsgBodyType.RES_FULL_WHITEBOARD_DATA:
        this.handleSyncResponse(binMessage, fromUserId, id, message);
        break;
      default:
        break;
    }
  };

  applyRemoteUpdate = (update: Uint8Array) => {
    if (!this.doc) {
      return;
    }
    try {
      Y.applyUpdate(this.doc, update, WHITEBOARD_REMOTE_ORIGIN);
    } catch (e) {
      console.error('[WhiteboardController] failed to apply remote update', e);
    }
  };

  private sendSyncRequest = () => {
    const { doc, config } = this;
    if (!doc || !config) {
      return;
    }

    this.syncRequestAttempts += 1;
    if (this.syncRequestAttempts > MAX_SYNC_REQUEST_ATTEMPTS) {
      // Stop retrying when no peer on this (fileId, page) has answered.
      // A later page switch / reconnect / visibilitychange resync will try again.
      this.pendingSyncRequestId = null;
      if (this.syncRetryTimer) {
        clearTimeout(this.syncRetryTimer);
        this.syncRetryTimer = null;
      }
      return;
    }

    const requestId = crypto.randomUUID();
    this.pendingSyncRequestId = requestId;
    config.send(
      DataMsgBodyType.REQ_FULL_WHITEBOARD_DATA,
      Y.encodeStateVector(doc),
      requestId,
      this.buildScopeMessage(),
    );

    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
    }
    this.syncRetryTimer = setTimeout(() => {
      if (this.pendingSyncRequestId === requestId && this.doc) {
        this.sendSyncRequest();
      }
    }, SYNC_RETRY_DELAY_MS);
  };

  resync = () => {
    if (this.doc) {
      this.syncRequestAttempts = 0;
      this.sendSyncRequest();
    }
  };

  broadcastFullState = () => {
    const { doc, elementsMap, config } = this;
    if (!doc || !elementsMap || !config || !config.canWrite()) {
      return;
    }
    if (elementsMap.size === 0) {
      return;
    }
    const update = Y.encodeStateAsUpdate(doc);
    if (update.length > 0) {
      config.send(
        DataMsgBodyType.SCENE_UPDATE,
        update,
        undefined,
        this.buildScopeMessage(),
      );
    }
  };

  private handleSyncRequest = (
    binMessage: Uint8Array,
    _fromUserId: string,
    id?: string,
    message?: string,
  ) => {
    const { doc, config } = this;
    if (!doc || !config || !id) {
      return;
    }
    const scope = this.parseScope(message);
    if (!this.matchesActiveScope(scope)) {
      return;
    }
    const missing = Y.encodeStateAsUpdate(doc, binMessage);
    const stateVector = uint8ToBase64(Y.encodeStateVector(doc));

    const respond = () => {
      config.send(
        DataMsgBodyType.RES_FULL_WHITEBOARD_DATA,
        missing,
        id,
        this.buildScopeMessage({ stateVector }),
      );
    };

    // Primary responder (presenter) / writers respond immediately; everyone
    // else jitters 250-800ms as a randomized backup responder.
    if (config.isPrimaryResponder?.() ?? config.canWrite()) {
      respond();
      return;
    }
    const delay = 250 + Math.floor(Math.random() * 550);
    const timer = setTimeout(respond, delay);
    this.backupResponseTimers.set(id, timer);
  };

  private handleSyncResponse = (
    binMessage: Uint8Array,
    _fromUserId: string,
    id?: string,
    message?: string,
  ) => {
    const scope = this.parseScope(message);
    if (!this.matchesActiveScope(scope)) {
      return;
    }

    if (id) {
      const timer = this.backupResponseTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.backupResponseTimers.delete(id);
      }
    }

    if (id !== this.pendingSyncRequestId || !this.doc) {
      return;
    }

    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }
    this.pendingSyncRequestId = null;
    this.syncRequestAttempts = 0;

    if (binMessage.length > 0) {
      this.applyRemoteUpdate(binMessage);
    }

    // The responder sent its state vector; push any state we have beyond it
    // back to the room so nobody loses concurrent local edits.
    let stateVector: Uint8Array | null = null;
    if (scope && scope.stateVector) {
      try {
        stateVector = base64ToUint8(scope.stateVector);
      } catch {
        stateVector = null;
      }
    }

    if (stateVector && this.config && this.doc) {
      const extra = Y.encodeStateAsUpdate(this.doc, stateVector);
      if (extra.length > 0) {
        this.config.send(
          DataMsgBodyType.SCENE_UPDATE,
          extra,
          undefined,
          this.buildScopeMessage(),
        );
      }
    }
  };

  /**
   * `doc.on('update')` broadcaster. Remote-originated state is persisted
   * locally (debounced) but never re-broadcast; read-only users persist but
   * never broadcast; everyone else broadcasts and persists.
   */
  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    this.scheduleSave();

    if (origin === WHITEBOARD_REMOTE_ORIGIN) {
      return;
    }
    const config = this.config;
    if (!config || !config.canWrite()) {
      return;
    }
    config.send(
      DataMsgBodyType.SCENE_UPDATE,
      update,
      undefined,
      this.buildScopeMessage(),
    );
  };

  private scheduleSave = () => {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.saveNow();
    }, SAVE_DEBOUNCE_MS);
  };

  /**
   * Flush the pending save, destroy the doc (detaching our handler first) and
   * clear all timers/state. `Y.Doc` auto-removes its `update` listeners on
   * destroy, but we still detach explicitly to avoid leaks.
   */
  private teardownDoc = async () => {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      // Flush the pending save before the doc is destroyed.
      await this.saveNow();
    }
    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }
    for (const t of this.backupResponseTimers.values()) {
      clearTimeout(t);
    }
    this.backupResponseTimers.clear();
    this.pendingSyncRequestId = null;
    this.syncRequestAttempts = 0;

    if (this.doc) {
      this.doc.off('update', this.handleDocUpdate);
      this.doc.destroy();
    }
    this.doc = null;
    this.elementsMap = null;
    this.roomSid = '';
    this.fileId = '';
    this.page = 0;
  };
}

let instance: WhiteboardController | null = null;
export const getWhiteboardController = () => {
  if (!instance) {
    instance = new WhiteboardController();
  }
  return instance;
};
