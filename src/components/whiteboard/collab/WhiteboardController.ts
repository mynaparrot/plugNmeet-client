import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { Collaborator, SocketId } from '@excalidraw/excalidraw/types';

import { getNatsConn } from '../../../helpers/nats';
import {
  loadWhiteboardPageSnapshot,
  saveWhiteboardPageSnapshot,
} from './whiteboardPersistence';
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
const SAVE_DEBOUNCE_MS = 1000;
const INITIAL_REQUEST_TIMEOUT_MS = 4000;

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
    this.ensurePresence();
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

  /**
   * Creates (or reuses) the active Yjs doc/elements map for a whiteboard page.
   * Returns true when a new doc was created; false when no config was provided
   * or the requested page is already active.
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

    if (options?.hydrate) {
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
      this.sendWhiteboardData(
        DataMsgBodyType.SCENE_UPDATE,
        update,
        undefined,
        this.buildScopeMessage(),
      );
    }
  };

  /**
   * Handles a whiteboard synchronization request.
   *
   * For a newly joined user without scope information, sends the active
   * whiteboard metadata together with the full active Yjs document, falling
   * back to its persisted snapshot when the document is empty.
   *
   * For an existing user requesting the active page, sends only the Yjs updates
   * missing from the requester's state vector. Requests for another page are
   * served from that page's persisted snapshot.
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
      });
    }

    if (sendFullInitialData) {
      if (doc && elementsMap && elementsMap.size > 0) {
        responseUpdate = Y.encodeStateAsUpdate(doc);
      } else {
        const stored = await loadWhiteboardPageSnapshot(this.fileId, this.page);

        if (!stored?.length) {
          return;
        }

        if (!this.doc || !this.config) {
          return;
        }

        responseUpdate = stored;
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

      responseUpdate = stored;
      responseMessage = JSON.stringify({
        fileId: senderScope.fileId,
        page: senderScope.page,
      });
    }

    const respond = () => {
      const timer = this.backupResponseTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.backupResponseTimers.delete(id);
      }
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
      this.applyRemoteUpdate(binMessage);
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
    this.sendWhiteboardData(
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
    this.pendingSyncRequestIds.clear();
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
