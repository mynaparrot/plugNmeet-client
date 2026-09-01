import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import { create, toJsonString } from '@bufbuild/protobuf';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  DataMsgBodyType,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
  SessionDataHeaderSchema,
  SessionDataType,
  SessionDataHeader,
} from 'plugnmeet-protocol-js';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { Collaborator, SocketId } from '@excalidraw/excalidraw/types';

import { getNatsConn } from '../../../helpers/nats';
import {
  SESSION_DATA_MAX_WIRE_BYTES,
  SAVE_MAX_WAIT_MS,
  SessionDataSyncState,
  diffKeyOf,
  isDiffKey,
  canonicalKeyOf,
  compress,
  decompress,
} from '../../../helpers/libs/sessionDataSync';
import {
  listWhiteboardPages,
  loadWhiteboardPageSnapshot,
  saveWhiteboardPageSnapshot,
} from './whiteboardPersistence';
import { DB_STORE_NAMES, idbStore } from '../../../helpers/libs/idb';
import { isIncomingNewer, WHITEBOARD_ELEMENTS_MAP } from './utils';
import { store } from '../../../store';
import {
  participantsSelector,
  selectWhiteboardParticipants,
} from '../../../store/slices/participantSlice';
import {
  base64ToUint8,
  isUserRecorder,
  uint8ToBase64,
} from '../../../helpers/utils';
import type { IParticipant } from '../../../store/slices/interfaces/participant';
import type {
  WhiteboardControllerConfig,
  WhiteboardPresence,
  WhiteboardScope,
  WhiteboardYjsSnapshot,
} from './types';
import { WhiteboardDataAsDonorData } from '../../../store/slices/interfaces/whiteboard';
import { addWhiteboardDataSentFromDonor } from '../../../store/slices/whiteboard';

export const WHITEBOARD_REMOTE_ORIGIN = 'whiteboard-remote';
const SYNC_RETRY_DELAY_MS = 2000;
const MAX_SYNC_REQUEST_ATTEMPTS = 3;
const INITIAL_REQUEST_TIMEOUT_MS = 4000;
const SERVER_FIRST_SYNC_TIMEOUT_MS = 1500;

export class WhiteboardController {
  private doc: Y.Doc | null = null;
  private elementsMap: Y.Map<string> | null = null;

  // separate from the page-scoped CRDT doc so cursor presence survives whiteboard page/file switches.
  private presenceDoc: Y.Doc | null = null;
  private awareness: Awareness | null = null;

  private roomSid = '';
  private fileId = '';
  private page = 0;
  private generation = 0;
  private config: WhiteboardControllerConfig | null = null;
  private pendingSyncRequestIds = new Set<string>();
  private syncRequestAttempts = 0;
  private backupResponseTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private syncRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private initialRequestResolver:
    ((data: { fileId: string; page: number } | null) => void) | null = null;
  private initialRequestTimer: ReturnType<typeof setTimeout> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  // Local-origin doc updates (user annotations) counted since the last
  // analytics flush. Sent as an INCRBY delta, so it resets after each send.
  private pendingAnnotations = 0;
  // Per-(fileId,page) checkpoint + rolling-diff save decision state. Retained
  // across page switches so rejoining a page resumes diffing from its last
  // checkpoint baseline instead of re-uploading a full state.
  private syncStates = new Map<string, SessionDataSyncState>();
  private sessionDataWaiters = new Map<
    string,
    { resolve: () => void; timer: ReturnType<typeof setTimeout> }
  >();
  private listeners = new Set<() => void>();
  private snapshot: WhiteboardYjsSnapshot | null = null;

  /**
   * Serializes concurrent `sync()` calls so page/file changes that fire in
   * quick succession never interleave teardown/hydration of the CRDT doc.
   */
  private syncChain: Promise<void> = Promise.resolve();

  private pageKey = (fileId: string, page: number) => `${fileId}_${page}`;

  private isCurrentUserPresenter = (): boolean =>
    !!store.getState().session.currentUser?.metadata?.isPresenter;

  private canParticipantEdit = (
    participant: IParticipant,
    defaultRoomLock: boolean | undefined,
  ): boolean => {
    if (participant.metadata?.isPresenter) {
      return true;
    }
    if (isUserRecorder(participant.userId)) {
      return false;
    }
    const lock = participant.metadata?.lockSettings?.lockWhiteboard;
    if (typeof lock === 'boolean') {
      return !lock;
    }
    return !(defaultRoomLock ?? true);
  };

  /**
   * Tag every outbound yjs message with the `(fileId, page)` scope so peers
   * can drop messages belonging to a different active page.
   */
  private buildScopeMessage = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({ fileId: this.fileId, page: this.page, ...extra });

  private parseScope = (message?: string): WhiteboardScope | null => {
    if (!message) return null;
    try {
      return JSON.parse(message) as WhiteboardScope;
    } catch {
      return null;
    }
  };

  private matchesActiveScope = (scope: WhiteboardScope | null): boolean =>
    !!scope &&
    !!this.doc &&
    scope.fileId === this.fileId &&
    scope.page === this.page;

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
    this.ensurePresence();
  };

  /**
   * Point the controller at a specific whiteboard page and start syncing it.
   * No-op when no config was provided or the requested page is already the
   * active session. Otherwise tears down the previous session (flushing the
   * pending save), fetches the authoritative snapshot from the server for the
   * presenter, then kicks off the peer state-vector sync request.
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

  /**
   * Creates (or reuses) the active Yjs doc/elements map for a whiteboard page.
   * For the presenter this awaits the authoritative server snapshot before
   * returning. Returns true when a new doc was created; false when no config
   * was provided or the requested page is already active.
   */
  private setupDoc = async (
    fileId: string,
    page: number,
    options?: { hydrate?: boolean },
  ): Promise<boolean> => {
    const config = this.config;
    if (!config) {
      return false;
    }
    if (
      this.doc &&
      this.fileId === fileId &&
      this.page === page &&
      this.roomSid === config.roomSid
    ) {
      return false;
    }

    if (this.doc) {
      await this.teardownDoc();
    }

    const doc = new Y.Doc();
    const elementsMap = doc.getMap<string>(WHITEBOARD_ELEMENTS_MAP);

    this.doc = doc;
    this.elementsMap = elementsMap;
    this.roomSid = config.roomSid;
    this.fileId = fileId;
    this.page = page;

    doc.on('update', this.handleDocUpdate);

    if (options?.hydrate) {
      const canonicalKey = this.pageKey(fileId, page);
      // Fetch both the canonical checkpoint and its rolling diff. Each uses its
      // own waiter (sessionDataWaiters keyed by literal key); the server replies
      // with an empty response for missing keys, and the 1.5s timeout bounds
      // the total wait.
      await Promise.all([
        this.fetchSessionData(canonicalKey),
        this.fetchSessionData(diffKeyOf(canonicalKey)),
      ]);
    }

    this.generation++;
    this.emitChange();

    return true;
  };

  private doSync = async (fileId: string, page: number, hydrate: boolean) => {
    const created = await this.setupDoc(fileId, page, { hydrate });
    if (!created) {
      return;
    }

    this.syncRequestAttempts = 0;
    this.sendSyncRequest();
  };

  /** Flush the pending save, destroy the doc and reset all session fields. */
  teardown = async () => {
    await this.teardownDoc();
    this.generation++;
    this.emitChange();
  };

  /** `teardown()` plus tear down room presence and forget the transport/config entirely. */
  destroy = async () => {
    await this.teardown();
    this.destroyPresence();
    this.config = null;
  };

  /**
   * Flush the pending save, destroy the doc (detaching our handler first) and
   * clear all timers/state. `Y.Doc` auto-removes its `update` listeners on
   * destroy, but we still detach explicitly to avoid leaks.
   */
  private clearSaveTimers = () => {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  };

  private getSyncState = (key: string): SessionDataSyncState => {
    let s = this.syncStates.get(key);
    if (!s) {
      s = new SessionDataSyncState();
      this.syncStates.set(key, s);
    }
    return s;
  };

  private teardownDoc = async () => {
    if (this.saveTimer) {
      this.clearSaveTimers();
      // Flush the pending save before the doc is destroyed. Force a full
      // checkpoint so the server keeps a consistent latest full state.
      await this.saveNow(true);
    }
    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }
    for (const t of this.backupResponseTimers.values()) {
      clearTimeout(t);
    }
    this.backupResponseTimers.clear();
    this.pendingSyncRequestIds.clear();
    this.syncRequestAttempts = 0;
    for (const waiter of this.sessionDataWaiters.values()) {
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
    this.sessionDataWaiters.clear();

    if (this.doc) {
      this.doc.off('update', this.handleDocUpdate);
      this.doc.destroy();
    }
    this.doc = null;
    this.elementsMap = null;
    this.roomSid = '';
    this.fileId = '';
    this.page = 0;
    this.pendingAnnotations = 0;
  };

  saveNow = async (forceCheckpoint = false) => {
    this.clearSaveTimers();
    this.flushAnnotations();
    const { doc, elementsMap, fileId } = this;
    if (!this.config || !doc || !elementsMap || !fileId) {
      return;
    }
    if (!this.isCurrentUserPresenter() || elementsMap.size === 0) {
      return;
    }
    try {
      const canonicalKey = this.pageKey(fileId, this.page);
      const state = this.getSyncState(canonicalKey);
      const plan = state.planSave(doc, canonicalKey, { forceCheckpoint });
      if (plan.skipReason === 'empty-diff') {
        // Nothing changed since the last checkpoint; skip the upload entirely.
        return;
      }
      const wire = compress(plan.update);
      if (wire.length > SESSION_DATA_MAX_WIRE_BYTES) {
        // Oversize: the NATS max_payload would reject it. Skip the send but
        // keep degradation safe (server keeps last good checkpoint; live peers
        // remain authoritative). We deliberately do NOT noteCheckpointUploaded
        // so the next flush retries the checkpoint rather than baselining diffs
        // against an upload the server never received.
        console.warn(
          `[WhiteboardController] SESSION_DATA payload for ${plan.key} is too large (${wire.length} bytes); skipping upload`,
        );
        if (plan.kind === 'checkpoint') {
          // Still refresh the local export cache for checkpoints.
          await saveWhiteboardPageSnapshot(fileId, this.page, plan.update);
        }
        return;
      }
      if (plan.kind === 'checkpoint') {
        // IndexedDB is now only an export cache.
        await saveWhiteboardPageSnapshot(fileId, this.page, plan.update);
      }
      // Server is the source of truth for sync.
      await this.uploadSessionData(wire, plan.key);
      if (plan.kind === 'checkpoint') {
        state.noteCheckpointUploaded(doc, wire.length);
      }
    } catch (e) {
      console.error('[WhiteboardController] failed to save page', e);
    }
  };

  /**
   * Flush the pending annotation count to analytics. The server applies
   * event_value_integer with Redis INCRBY, so this sends the number of
   * annotations since the last flush (a delta), not a running total.
   */
  private flushAnnotations = () => {
    if (this.pendingAnnotations <= 0) return;
    const conn = getNatsConn();
    if (!conn) return; // keep the count; it rides the next flush
    conn.sendAnalyticsData(
      AnalyticsEvents.ANALYTICS_EVENT_USER_WHITEBOARD_ANNOTATED,
      AnalyticsEventType.USER,
      undefined,
      undefined,
      this.pendingAnnotations.toString(),
    );
    this.pendingAnnotations = 0;
  };

  /**
   * Schedule a save. The first unsaved change arms a single flush timer;
   * changes made during the window ride along in the same save, so no
   * change waits longer than SAVE_MAX_WAIT_MS and at most one save
   * happens per window.
   */
  private scheduleSave = () => {
    if (this.saveTimer) return; // a flush is already scheduled
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.saveNow();
    }, SAVE_MAX_WAIT_MS);
  };

  /**
   * `doc.on('update')` handler. Remote-originated updates are never
   * re-broadcast. The presenter schedules a throttled snapshot upload to the
   * server (and export cache); other writers broadcast live incremental
   * updates to the room.
   */
  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    this.scheduleSave();

    if (origin === WHITEBOARD_REMOTE_ORIGIN) {
      return;
    }
    this.pendingAnnotations++;

    const config = this.config;
    if (!config || !config.canWrite()) {
      return;
    }
    // Live edits stay raw (small and frequent — gzip overhead not worth it).
    this.sendWhiteboardData(
      DataMsgBodyType.SCENE_UPDATE,
      update,
      undefined,
      this.buildScopeMessage(),
    );
  };

  uploadSessionData = async (update: Uint8Array, key: string) => {
    const conn = getNatsConn();
    if (!conn || !this.fileId) return;
    let value = update;
    if (conn.enableE2EE) {
      const enc = await conn.encryptData(update);
      if (typeof enc === 'undefined') return;
      value = enc;
    }
    conn.sendMessageToCoreWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.SESSION_DATA_SAVE,
        msg: toJsonString(
          SessionDataHeaderSchema,
          create(SessionDataHeaderSchema, {
            dataType: SessionDataType.WHITEBOARD,
            key,
          }),
        ),
        binMsg: value,
      }),
    );
  };

  fetchSessionData = (key: string) =>
    new Promise<void>((resolve) => {
      const conn = getNatsConn();
      if (!conn) {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        this.sessionDataWaiters.delete(key);
        resolve();
      }, SERVER_FIRST_SYNC_TIMEOUT_MS);
      this.sessionDataWaiters.set(key, { resolve, timer });
      conn.sendMessageToSystemWorker(
        create(NatsMsgClientToServerSchema, {
          event: NatsMsgClientToServerEvents.SESSION_DATA_FETCH_REQUEST,
          msg: toJsonString(
            SessionDataHeaderSchema,
            create(SessionDataHeaderSchema, {
              dataType: SessionDataType.WHITEBOARD,
              key,
            }),
          ),
        }),
      );
    });

  handleSessionDataResponse = (
    header: SessionDataHeader,
    value: Uint8Array,
  ) => {
    if (header.dataType !== SessionDataType.WHITEBOARD) return;
    const key = header.key;
    if (!key) return;

    const doc = this.doc;
    // Treat diff keys as active: compare against the canonical key so a diff
    // response still applies to the live doc, but resolve the waiter by the
    // literal (possibly diff) key.
    const isActive =
      !!doc && canonicalKeyOf(key) === this.pageKey(this.fileId, this.page);

    const resolveWaiter = () => {
      const waiter = this.sessionDataWaiters.get(key);
      if (waiter) {
        clearTimeout(waiter.timer);
        this.sessionDataWaiters.delete(key);
        waiter.resolve();
      }
    };

    if (value && value.length > 0) {
      // apply the active page live as a raw Yjs update (never decode+rebuild)
      if (doc && isActive) {
        Y.applyUpdate(doc, value, WHITEBOARD_REMOTE_ORIGIN);
        this.config?.onRemoteUpdate?.();
      }
      // Never persist `~d` (diff) keys to IndexedDB — they would pollute
      // listWhiteboardPages / peer-serving. Canonical responses keep their
      // (already decompressed) value cached for export.
      if (!isDiffKey(key)) {
        void idbStore(DB_STORE_NAMES.WHITEBOARD, key, value).then(
          resolveWaiter,
          resolveWaiter,
        );
      } else {
        resolveWaiter();
      }
    } else {
      resolveWaiter();
    }
  };

  backfillMissingPages = async () => {
    if (!this.isCurrentUserPresenter() || !this.fileId) return;
    const fileId = this.fileId;
    const totalPages = store.getState().whiteboard.totalPages;
    if (!Number.isInteger(totalPages) || totalPages <= 0) return;

    const expected = Array.from({ length: totalPages }, (_, i) => i + 1);
    const local = await listWhiteboardPages(fileId);
    const missing = expected.filter((p) => !local.includes(p));
    await Promise.all(
      missing.map((page) => this.fetchSessionData(this.pageKey(fileId, page))),
    );
  };

  /**
   * Write local Excalidraw elements into the CRDT map. Deleted elements are
   * stored as `isDeleted: true` tombstones - we never call `elementsMap.delete()`.
   *
   * Version-aware: an incoming element only replaces the stored value when it
   * is newer according to Excalidraw's reconciliation rule (higher `version`;
   * on equal version, lower `versionNonce`). This protects the local write
   * path from clobbering a newer value already present in the CRDT.
   */
  mergeElements = (
    elements: readonly ExcalidrawElement[],
    isEditingElement?: (id: string) => boolean,
  ) => {
    const { doc, elementsMap } = this;
    if (!doc || !elementsMap) {
      return;
    }
    doc.transact(() => {
      for (const incoming of elements) {
        this.updateElementIfNewer(elementsMap, incoming, isEditingElement);
      }
    });
  };

  /**
   * Version-aware write for a single element. Keeps the stored value when it
   * is newer than the incoming candidate (higher version; on tie, lower
   * versionNonce). Mirrors Excalidraw's `shouldDiscardRemoteElement`.
   */
  private updateElementIfNewer = (
    elementsMap: Y.Map<string>,
    incoming: ExcalidrawElement,
    isEditingElement?: (id: string) => boolean,
  ) => {
    const serialized = JSON.stringify(incoming);
    const stored = elementsMap.get(incoming.id);
    if (stored === serialized) {
      return;
    }

    // Mirror Excalidraw: a locally edited/resized/new element always wins,
    // regardless of its version.
    if (isEditingElement?.(incoming.id)) {
      elementsMap.set(incoming.id, serialized);
      return;
    }

    if (stored) {
      try {
        const current = JSON.parse(stored) as ExcalidrawElement;
        if (!isIncomingNewer(current, incoming)) {
          return;
        }
      } catch {
        // Malformed stored value; replace it below.
      }
    }
    elementsMap.set(incoming.id, serialized);
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

  private sendWhiteboardData = (
    type: DataMsgBodyType,
    binMessage: Uint8Array,
    id?: string,
    message?: string,
    to?: string,
  ) => {
    const conn = getNatsConn();
    if (conn) {
      void conn.sendWhiteboardData(type, { binMessage, id, message, to });
    }
  };

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
          let payload = binMessage;
          // Full-state broadcasts arrive gzip-compressed (scope.gzip); live edits and
          // diffs stay raw.
          if (scope?.gzip) {
            try {
              payload = decompress(binMessage);
            } catch (e) {
              console.error(
                '[WhiteboardController] failed to decompress scene update',
                e,
              );
              break;
            }
          }
          this.applyRemoteUpdate(payload);
        }
        break;
      }
      case DataMsgBodyType.WHITEBOARD_SYNC_REQUEST:
        void this.handleSyncRequest(binMessage, fromUserId, id, message);
        break;
      case DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE:
        void this.handleSyncResponse(binMessage, fromUserId, id, message);
        break;
      case DataMsgBodyType.POINTER_UPDATE:
        this.applyRemoteAwareness(binMessage);
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
      return;
    }
    this.config?.onRemoteUpdate?.();
  };

  private sendSyncRequest = () => {
    const { doc, config } = this;
    if (!doc || !config) {
      return;
    }

    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }

    const targets = this.getSyncRequestTargets();
    if (targets.length === 0) {
      this.pendingSyncRequestIds.clear();
      return;
    }

    this.syncRequestAttempts += 1;
    if (this.syncRequestAttempts > MAX_SYNC_REQUEST_ATTEMPTS) {
      this.pendingSyncRequestIds.clear();
      return;
    }

    this.pendingSyncRequestIds.clear();
    const stateVector = Y.encodeStateVector(doc);
    for (const toUserId of targets) {
      const requestId = crypto.randomUUID();
      this.pendingSyncRequestIds.add(requestId);
      this.sendWhiteboardData(
        DataMsgBodyType.WHITEBOARD_SYNC_REQUEST,
        stateVector,
        requestId,
        this.buildScopeMessage(),
        toUserId,
      );
    }

    this.syncRetryTimer = setTimeout(() => {
      if (this.pendingSyncRequestIds.size > 0 && this.doc) {
        this.sendSyncRequest();
      }
    }, SYNC_RETRY_DELAY_MS);
  };

  private getSyncRequestTargets = (): string[] => {
    const state = store.getState();
    const currentUserId = state.session.currentUser?.userId;
    if (!currentUserId) {
      return [];
    }

    const defaultRoomLock =
      state.session.currentRoom.metadata?.defaultLockSettings?.lockWhiteboard;

    return participantsSelector
      .selectAll(state)
      .filter(
        (p) =>
          p.userId !== currentUserId &&
          p.isOnline &&
          !p.metadata?.waitForApproval,
      )
      .sort((a, b) => {
        const presenterDiff =
          (b.metadata?.isPresenter ? 1 : 0) - (a.metadata?.isPresenter ? 1 : 0);
        if (presenterDiff !== 0) {
          return presenterDiff;
        }
        const editDiff =
          (this.canParticipantEdit(b, defaultRoomLock) ? 1 : 0) -
          (this.canParticipantEdit(a, defaultRoomLock) ? 1 : 0);
        if (editDiff !== 0) {
          return editDiff;
        }
        const adminDiff =
          (b.metadata?.isAdmin ? 1 : 0) - (a.metadata?.isAdmin ? 1 : 0);
        if (adminDiff !== 0) {
          return adminDiff;
        }
        return a.joinedAt - b.joinedAt;
      })
      .slice(0, 3)
      .map((p) => p.userId);
  };

  resync = () => {
    if (this.doc) {
      this.syncRequestAttempts = 0;
      this.sendSyncRequest();
    }
  };

  requestInitialData = (): Promise<{ fileId: string; page: number } | null> => {
    return new Promise((resolve) => {
      const config = this.config;
      if (!config) {
        resolve(null);
        return;
      }

      // Single-flight: cancel any previous pending initial request.
      this.resolveInitialRequest(null);

      const targets = this.getSyncRequestTargets();
      if (targets.length === 0) {
        resolve(null);
        return;
      }

      this.initialRequestResolver = resolve;
      this.pendingSyncRequestIds.clear();
      const emptyStateVector = Y.encodeStateVector(new Y.Doc());

      for (const toUserId of targets) {
        const requestId = crypto.randomUUID();
        this.pendingSyncRequestIds.add(requestId);
        this.sendWhiteboardData(
          DataMsgBodyType.WHITEBOARD_SYNC_REQUEST,
          emptyStateVector,
          requestId,
          undefined,
          toUserId,
        );
      }

      this.initialRequestTimer = setTimeout(() => {
        this.resolveInitialRequest(null);
      }, INITIAL_REQUEST_TIMEOUT_MS);
    });
  };

  private resolveInitialRequest = (
    data: { fileId: string; page: number } | null,
  ) => {
    if (this.initialRequestResolver) {
      const resolve = this.initialRequestResolver;
      this.initialRequestResolver = null;
      resolve(data);
    }

    if (this.initialRequestTimer) {
      clearTimeout(this.initialRequestTimer);
      this.initialRequestTimer = null;
    }

    this.pendingSyncRequestIds.clear();

    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }

    this.syncRequestAttempts = 0;
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
      // Full-state broadcasts are gzip-compressed, flagged via scope.gzip.
      this.sendWhiteboardData(
        DataMsgBodyType.SCENE_UPDATE,
        compress(update),
        undefined,
        this.buildScopeMessage({ gzip: true }),
      );
    }
  };

  /**
   * Handles a whiteboard synchronization request.
   *
   * For a newly joined user without scope information, sends the active
   * whiteboard metadata together with the full active Yjs document, falling
   * back to its cached snapshot when the document is empty.
   *
   * For an existing user requesting the active page, sends only the Yjs updates
   * missing from the requester's state vector. Requests for another page are
   * served from that page's cached snapshot.
   */
  private handleSyncRequest = async (
    binMessage: Uint8Array,
    fromUserId: string,
    id?: string,
    message?: string,
  ) => {
    const { doc, config, elementsMap } = this;

    if (!config || !id || !config.excalidrawAPI) {
      return;
    }

    let responseMessage = this.buildScopeMessage();
    let responseUpdate: Uint8Array;
    let sendFullInitialData = false;

    const senderScope = this.parseScope(message);

    if (
      !senderScope ||
      !senderScope.fileId ||
      typeof senderScope.page !== 'number'
    ) {
      sendFullInitialData = true;

      const { currentOfficeFilePages } = store.getState().whiteboard;
      const appState = config.excalidrawAPI.getAppState();

      const initialData: WhiteboardDataAsDonorData = {
        currentPageNumber: this.page,
        currentWhiteboardOfficeFileId: this.fileId,
        currentOfficeFilePages,
        appState: {
          height: appState.height,
          width: appState.width,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          zoomValue: appState.zoom.value,
          theme: appState.theme,
          viewBackgroundColor: appState.viewBackgroundColor,
          zenModeEnabled: appState.zenModeEnabled,
          gridSize: appState.gridSize,
        },
      };

      responseMessage = this.buildScopeMessage({
        initial_data: JSON.stringify(initialData),
        gzip: true,
      });
    }

    if (sendFullInitialData) {
      if (doc && elementsMap && elementsMap.size > 0) {
        // Full-state payloads are gzip-compressed, flagged via scope.gzip.
        responseUpdate = compress(Y.encodeStateAsUpdate(doc));
      } else {
        const stored = await loadWhiteboardPageSnapshot(this.fileId, this.page);

        if (!stored?.length) {
          return;
        }

        if (!this.doc || !this.config) {
          return;
        }

        // Full-state payloads are gzip-compressed, flagged via scope.gzip.
        responseUpdate = compress(stored);
      }
    } else if (
      doc &&
      elementsMap &&
      this.matchesActiveScope(senderScope) &&
      elementsMap.size > 0
    ) {
      responseUpdate = Y.encodeStateAsUpdate(doc, binMessage);

      responseMessage = this.buildScopeMessage({
        stateVector: uint8ToBase64(Y.encodeStateVector(doc)),
      });
    } else if (
      senderScope &&
      senderScope.fileId &&
      typeof senderScope.page === 'number'
    ) {
      const stored = await loadWhiteboardPageSnapshot(
        senderScope.fileId,
        senderScope.page,
      );

      if (!stored?.length) {
        return;
      }

      if (!this.doc || !this.config) {
        return;
      }

      // Full-state payloads are gzip-compressed, flagged via scope.gzip.
      responseUpdate = compress(stored);
      responseMessage = JSON.stringify({
        fileId: senderScope.fileId,
        page: senderScope.page,
        gzip: true,
      });
    }

    const respond = () => {
      const timer = this.backupResponseTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.backupResponseTimers.delete(id);
      }
      // Compression is decided per-path above (full-state responses only).
      this.sendWhiteboardData(
        DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE,
        responseUpdate,
        id,
        responseMessage,
        fromUserId,
      );
    };

    if (config.isPrimaryResponder?.() ?? config.canWrite()) {
      respond();
      return;
    }

    const delay = 250 + Math.floor(Math.random() * 550);
    const timer = setTimeout(respond, delay);
    this.backupResponseTimers.set(id, timer);
  };

  /**
   * Handles a valid synchronization response.
   *
   * Initial responses (with donor metadata in `scope.initial_data`) bootstrap
   * a non-presenter's whiteboard session: the donor's file/page is applied to
   * Redux, an empty doc is created for that scope when needed, and the
   * included full scene is applied as a Yjs update via `applyRemoteUpdate`.
   * The first valid response resolves the pending `requestInitialData()`
   * promise. Normal responses must match the active file/page scope and may
   * include a state vector for reverse synchronization.
   */
  private handleSyncResponse = async (
    binMessage: Uint8Array,
    fromUserId: string,
    id?: string,
    message?: string,
  ) => {
    const scope = this.parseScope(message);

    if (!scope || !id || !this.pendingSyncRequestIds.has(id)) {
      return;
    }

    const hasInitialData =
      typeof scope.initial_data === 'string' && scope.initial_data.length > 0;

    if (!hasInitialData && !this.doc) {
      return;
    }

    if (!hasInitialData && !this.matchesActiveScope(scope)) {
      return;
    }

    const timer = this.backupResponseTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.backupResponseTimers.delete(id);
    }

    this.pendingSyncRequestIds.delete(id);

    let donorFileId = this.fileId;
    let donorPage = this.page;

    if (hasInitialData) {
      try {
        const initialData = JSON.parse(
          scope.initial_data!,
        ) as WhiteboardDataAsDonorData;

        donorFileId = initialData.currentWhiteboardOfficeFileId;
        donorPage = initialData.currentPageNumber;

        store.dispatch(addWhiteboardDataSentFromDonor(initialData));
      } catch (error) {
        console.error(
          '[WhiteboardController] failed to parse initial whiteboard data',
          error,
        );
        return;
      }

      await this.setupDoc(donorFileId, donorPage);

      if (!this.doc || !this.elementsMap) {
        return;
      }
    }

    if (binMessage.length > 0) {
      let payload = binMessage;
      // Full-state responses arrive gzip-compressed (scope.gzip); diffs stay raw.
      if (scope.gzip) {
        try {
          payload = decompress(binMessage);
        } catch (e) {
          console.error(
            '[WhiteboardController] failed to decompress sync response',
            e,
          );
          return;
        }
      }
      this.applyRemoteUpdate(payload);
    }

    /*
     * Send back updates that the responder did not have when it generated its
     * state vector.
     */
    if (scope.stateVector && this.config && this.doc) {
      try {
        const stateVector = base64ToUint8(scope.stateVector);
        const extra = Y.encodeStateAsUpdate(this.doc, stateVector);

        if (extra.length > 0) {
          // Reverse-sync diff stays raw.
          this.sendWhiteboardData(
            DataMsgBodyType.SCENE_UPDATE,
            extra,
            undefined,
            this.buildScopeMessage(),
            fromUserId,
          );
        }
      } catch (error) {
        console.error(
          '[WhiteboardController] failed to process responder state vector',
          error,
        );
      }
    }

    if (hasInitialData) {
      this.resolveInitialRequest({ fileId: donorFileId, page: donorPage });
      return;
    }

    if (this.pendingSyncRequestIds.size === 0) {
      if (this.syncRetryTimer) {
        clearTimeout(this.syncRetryTimer);
        this.syncRetryTimer = null;
      }

      this.syncRequestAttempts = 0;
    }
  };

  /**
   * Creates (or reuses) the room-scoped presence doc + Awareness instance.
   * Idempotent: presence survives page/file switches and is only torn down in
   * `destroy()`.
   */
  private ensurePresence = () => {
    if (this.presenceDoc) {
      return;
    }
    const presenceDoc = new Y.Doc();
    const awareness = new Awareness(presenceDoc);
    awareness.on('change', this.handleAwarenessChange);
    this.presenceDoc = presenceDoc;
    this.awareness = awareness;
  };

  private destroyPresence = () => {
    if (this.awareness) {
      this.awareness.off('change', this.handleAwarenessChange);
      this.awareness.destroy();
      this.awareness = null;
    }
    if (this.presenceDoc) {
      this.presenceDoc.destroy();
      this.presenceDoc = null;
    }
  };

  /**
   * Publishes this client's presence to the room (only when the current user
   * can write to the whiteboard).
   */
  setLocalPresence = (presence: WhiteboardPresence) => {
    if (this.config?.canWrite() && this.awareness) {
      this.awareness.setLocalState(presence);
    }
  };

  clearLocalPresence = () => {
    if (this.awareness) {
      this.awareness.setLocalState(null);
    }
  };

  refreshCollaborators = () => {
    this.syncCollaborators();
  };

  /**
   * Awareness change handler. Always refreshes the rendered collaborators
   * first, then only echoes *our own* local changes back into the room (remote
   * updates must never be re-broadcast).
   */
  private handleAwarenessChange = (
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    this.syncCollaborators();

    if (origin === WHITEBOARD_REMOTE_ORIGIN) {
      return;
    }

    const changed = [...added, ...updated, ...removed];
    if (changed.length === 0) {
      return;
    }
    const { awareness, config } = this;
    if (!awareness || !config || !config.canWrite()) {
      return;
    }
    this.sendWhiteboardData(
      DataMsgBodyType.POINTER_UPDATE,
      encodeAwarenessUpdate(awareness, changed),
    );
  };

  /**
   * Rebuilds the `Map<SocketId, Collaborator>` rendered on the canvas from the
   * awareness states. Skips our own client id, states without a truthy `id`,
   * and any user that is no longer present / unlocked in the room.
   */
  private syncCollaborators = () => {
    const { config, awareness } = this;
    if (!config || !config.excalidrawAPI || !awareness) {
      return;
    }

    const activeIds = new Set(
      selectWhiteboardParticipants(store.getState())
        .filter((p) => p.isPresent || !p.isWhiteboardLocked)
        .map((p) => p.userId),
    );

    const collaborators = new Map<SocketId, Collaborator>();
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) {
        return;
      }
      if (!state.id) {
        return;
      }
      const id = String(state.id);
      if (!activeIds.has(id)) {
        return;
      }
      collaborators.set(id as SocketId, state as unknown as Collaborator);
    });

    config.excalidrawAPI.updateScene({ collaborators });
  };

  /**
   * Applies a remote awareness update received over NATS. The remote origin is
   * supplied so the `change` listener does not re-broadcast it.
   */
  private applyRemoteAwareness = (update: Uint8Array) => {
    if (!this.awareness) {
      return;
    }
    try {
      applyAwarenessUpdate(this.awareness, update, WHITEBOARD_REMOTE_ORIGIN);
    } catch (e) {
      console.error(
        '[WhiteboardController] failed to apply remote awareness',
        e,
      );
    }
  };
}

let instance: WhiteboardController | null = null;
export const getWhiteboardController = () => {
  if (!instance) {
    instance = new WhiteboardController();
  }
  return instance;
};
