import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
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
import { base64ToUint8, isUserRecorder, uint8ToBase64 } from '../../../helpers/utils';
import type { IParticipant } from '../../../store/slices/interfaces/participant';
import type {
  WhiteboardControllerConfig,
  WhiteboardPresence,
  WhiteboardScope,
  WhiteboardYjsSnapshot,
} from './types';
import { WhiteboardDataAsDonorData } from '../../../store/slices/interfaces/whiteboard';
import {
  addWhiteboardDataSentFromDonor,
  setWhiteboardCurrentPage,
  updateCurrentWhiteboardOfficeFileId,
} from '../../../store/slices/whiteboard';

export const WHITEBOARD_REMOTE_ORIGIN = 'whiteboard-remote';
const SYNC_RETRY_DELAY_MS = 2000;
const MAX_SYNC_REQUEST_ATTEMPTS = 3;
export const INITIAL_REQUEST_RETRY_MS = 500;
const INITIAL_REQUEST_TIMEOUT_MS = 4000;
const SERVER_FIRST_SYNC_TIMEOUT_MS = 1500;
const MISSING_UPDATE_RESYNC_THROTTLE_MS = 2000;
/** Per-peer throttle for pointing a peer that is stuck on a stale scope at the live one. */
const STALE_PEER_NUDGE_THROTTLE_MS = 2000;
// Stop firing targeted resyncs for a gap that never heals; anti-entropy still
// covers it at one peer per tick.
const MAX_MISSING_UPDATE_RESYNCS = 5;
const ANTI_ENTROPY_INTERVAL_MS = 25000;
const ANTI_ENTROPY_JITTER_MS = 5000;
const CANONICAL_RETRY_BASE_MS = 2000;
const CANONICAL_RETRY_MAX_MS = 30000;
/** How long a SESSION_DATA save waits for its SESSION_DATA_SAVE_RESPONSE ack. */
export const SAVE_ACK_TIMEOUT_MS = 3000;
/** Backoff for retrying an unconfirmed save (page still active or upload stashed). */
const SAVE_RETRY_BASE_MS = 2000;
const SAVE_RETRY_MAX_MS = 30000;
/** Total time a page/file switch may spend flushing the active page. */
const SAVE_FLUSH_TIMEOUT_MS = 5000;
/** Pause between flush attempts so an instantly failing save cannot spin. */
const SAVE_FLUSH_RETRY_DELAY_MS = 500;

/** Content of a page the presenter left before the server confirmed the save. */
interface PendingPageUpload {
  update: Uint8Array;
  /** Plan-time state vector; becomes the baseline once the upload is acked. */
  stateVector: Uint8Array;
  /** True when the page's canonical snapshot never arrived (upload goes to the ~d key). */
  unconfirmed: boolean;
}

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
  private backupResponseTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private syncRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private antiEntropyTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMissingUpdateResyncAt = 0;
  private missingUpdateResyncs = 0;
  private stalePeerNudgeAt = new Map<string, number>();
  private initialRequestResolver: ((data: { fileId: string; page: number } | null) => void) | null =
    null;
  private initialRequestTimer: ReturnType<typeof setTimeout> | null = null;
  // Scope Redux held when the initial bootstrap was requested: a donor whose
  // answer arrives after the presenter moved on must not override that scope.
  private initialRequestScope: { fileId: string; page: number } | null = null;
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
    {
      resolve: (arrived: boolean) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  // In-flight fetch per key, so concurrent callers share one request/response.
  private sessionDataFetches = new Map<string, Promise<boolean>>();
  // Waiter per SESSION_DATA_SAVE requestId, resolved by SESSION_DATA_SAVE_RESPONSE.
  private saveAckWaiters = new Map<
    string,
    {
      resolve: (ok: boolean) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  // All server saves run one at a time through this chain, so a new plan can
  // never overtake an in-flight upload (which would reorder writes per key).
  private saveChain: Promise<unknown> = Promise.resolve();
  private saveRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private saveRetryAttempt = 0;
  // Pages the presenter left before the save was confirmed; retried in the
  // background (survives page changes, dropped on destroy / lost presenter).
  private pendingPageUploads = new Map<string, PendingPageUpload>();
  private pendingUploadTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // Retry timers for unconfirmed canonical snapshots (late/empty responses).
  private canonicalRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // Pages whose canonical checkpoint snapshot has NOT yet been confirmed
  // present by the server. While a key is in this set, the local partial
  // state for that page must not be treated as authoritative: saves and
  // full-state broadcasts are paused until the canonical snapshot arrives
  // (at which point the self-heal path persists a fresh checkpoint and
  // re-broadcasts the now-complete state).
  private readonly unconfirmedCanonicalKeys = new Set<string>();
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

  /** Whether `userId` is an online, approved presenter. */
  private isUserPresenter = (userId?: string): boolean =>
    !!userId &&
    participantsSelector
      .selectAll(store.getState())
      .some(
        (p) =>
          p.userId === userId &&
          p.isOnline &&
          !p.metadata?.waitForApproval &&
          p.metadata?.isPresenter,
      );

  /** Whether any online peer other than the current user is the presenter. */
  hasPresenterOnline = () => {
    const state = store.getState();
    const currentUserId = state.session.currentUser?.userId;
    if (!currentUserId) {
      return false;
    }
    return participantsSelector
      .selectAll(state)
      .some(
        (p) =>
          p.userId !== currentUserId &&
          p.isOnline &&
          !p.metadata?.waitForApproval &&
          p.metadata?.isPresenter,
      );
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
    !!scope && !!this.doc && scope.fileId === this.fileId && scope.page === this.page;

  /**
   * Whether `doc` has finished hydrating the scope Redux already points at.
   * False during an in-flight page/file switch, when Redux is ahead of `doc`.
   */
  private isActiveScopeSettled = (): boolean => {
    if (!this.doc) {
      return false;
    }
    const authorized = this.storeScope();
    return this.fileId === authorized.fileId && this.page === authorized.page;
  };

  /**
   * The presenter owns the active page, so its doc is the source of truth even
   * when the page is empty — unless the canonical snapshot is still unconfirmed.
   */
  private isActiveScopeAuthoritative = (): boolean =>
    this.isActiveScopeSettled() &&
    this.isCurrentUserPresenter() &&
    !this.unconfirmedCanonicalKeys.has(this.pageKey(this.fileId, this.page));

  /**
   * Privately point a peer stuck on a stale `(fileId, page)` at the live one.
   * Works even when the presenter's current page is empty, and the peer's
   * navigation then re-runs `sync()` for the corrected scope.
   */
  private nudgeStalePeer = (toUserId: string, scope: WhiteboardScope) => {
    const conn = getNatsConn();
    if (!conn || !scope.fileId || typeof scope.page !== 'number') {
      return;
    }
    // During a switch Redux already holds the new scope while this doc is
    // still the old one: never drag a peer that is ahead of us back.
    if (!this.isActiveScopeSettled()) {
      return;
    }
    const now = Date.now();
    if (now - (this.stalePeerNudgeAt.get(toUserId) ?? 0) < STALE_PEER_NUDGE_THROTTLE_MS) {
      return;
    }
    this.stalePeerNudgeAt.set(toUserId, now);

    if (scope.fileId !== this.fileId) {
      void conn.sendWhiteboardData(DataMsgBodyType.FILE_CHANGE, {
        message: JSON.stringify({ fileId: this.fileId, page: this.page }),
        to: toUserId,
      });
    } else if (scope.page !== this.page) {
      void conn.sendWhiteboardData(DataMsgBodyType.PAGE_CHANGE, {
        message: `${this.page}`,
        to: toUserId,
      });
    }
  };

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
  sync = (fileId: string, page: number, options?: { hydrate?: boolean }): Promise<void> => {
    const hydrate = options?.hydrate ?? true;
    return this.enqueueSyncStep(() => this.doSync(fileId, page, hydrate));
  };

  /**
   * Append a step to the serialized doc lifecycle. A rejected step must not
   * poison the chain: the next step still runs.
   */
  private enqueueSyncStep = (step: () => Promise<unknown>): Promise<void> => {
    const run = () => step().then(() => undefined);
    this.syncChain = this.syncChain.then(run, run);
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
      // Fetch the canonical checkpoint FIRST, then the rolling diff — sequential
      // on purpose. handleSessionDataResponse applies each response before
      // resolving its waiter, so awaiting the canonical guarantees the base
      // snapshot is already in the doc before the diff is requested and applied.
      // (The server processes the two requests concurrently in a worker pool, so
      // parallel fetches can deliver the diff first.)
      let canonicalArrived = await this.fetchSessionData(canonicalKey);
      if (!canonicalArrived) {
        // One retry — transient loss is plausible under the concurrent worker pool.
        canonicalArrived = await this.fetchSessionData(canonicalKey);
      }
      if (canonicalArrived) {
        this.confirmCanonical(canonicalKey);
      } else {
        this.unconfirmedCanonicalKeys.add(canonicalKey);
        console.warn(
          `[WhiteboardController] canonical snapshot for ${canonicalKey} did not arrive; saving to the diff key only (no checkpoint) and pausing full-state broadcasts until it arrives`,
        );
        this.scheduleCanonicalRetry(canonicalKey);
      }
      // The diff is still fetched and applied locally even when the canonical is
      // unconfirmed; the gates below keep the partial state non-authoritative.
      await this.fetchSessionData(diffKeyOf(canonicalKey));

      const pending = this.pendingPageUploads.get(canonicalKey);
      if (pending) {
        // The presenter's own content from before the switch: merge it into the
        // hydrated doc (same lineage, so a raw Yjs update is enough) and drop
        // the entry so a stale background retry can't overwrite what this doc
        // uploads next.
        this.applyRemoteUpdate(pending.update);
        this.pendingPageUploads.delete(canonicalKey);
        const pendingTimer = this.pendingUploadTimers.get(canonicalKey);
        if (pendingTimer) {
          clearTimeout(pendingTimer);
          this.pendingUploadTimers.delete(canonicalKey);
        }
      }
      // A hydration builds a fresh doc, so any baseline recorded for this key
      // belongs to a doc that no longer exists: the next save is a checkpoint.
      this.getSyncState(canonicalKey).reset();
    }

    this.generation++;
    this.emitChange();
    // Anti-entropy runs for the lifetime of the doc (covers both doSync and
    // the donor-initial-data path that also creates a doc).
    this.scheduleAntiEntropy();

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
    // No further ack can arrive: settle everything still waiting. Pending page
    // uploads (which outlive a page) die with the controller.
    for (const waiter of this.saveAckWaiters.values()) {
      clearTimeout(waiter.timer);
      waiter.resolve(false);
    }
    this.saveAckWaiters.clear();
    for (const t of this.pendingUploadTimers.values()) {
      clearTimeout(t);
    }
    this.pendingUploadTimers.clear();
    this.pendingPageUploads.clear();
    this.resetSaveRetry();
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
    const hadPendingSave = this.saveTimer !== null;
    this.clearSaveTimers();
    this.resetSaveRetry();
    // Single save attempt before the doc is destroyed — a page switch must not
    // block on acks. A full checkpoint is forced when changes were pending;
    // when idle this no-ops via empty-diff. Unconfirmed content is stashed and
    // retried in the background.
    const confirmed = await this._saveRemoteNow({ forceCheckpoint: hadPendingSave });
    if (!confirmed && this.doc && this.isCurrentUserPresenter()) {
      this.stashPendingUpload(this.doc);
    }
    // Track the last-seen live state in the local export cache (presenter-only;
    // flushLocalSnapshot is a no-op for other roles).
    await this.flushLocalSnapshot();

    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }
    if (this.antiEntropyTimer) {
      clearTimeout(this.antiEntropyTimer);
      this.antiEntropyTimer = null;
    }
    for (const t of this.canonicalRetryTimers.values()) {
      clearTimeout(t);
    }
    this.canonicalRetryTimers.clear();
    this.lastMissingUpdateResyncAt = 0;
    this.missingUpdateResyncs = 0;
    this.stalePeerNudgeAt.clear();
    for (const t of this.backupResponseTimers.values()) {
      clearTimeout(t);
    }
    this.backupResponseTimers.clear();
    this.pendingSyncRequestIds.clear();
    this.syncRequestAttempts = 0;
    for (const waiter of this.sessionDataWaiters.values()) {
      clearTimeout(waiter.timer);
      // Teardown means these fetches will never get their response.
      waiter.resolve(false);
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

  /** Run `task` once every previously queued save has settled. */
  private enqueueSave = <T>(task: () => Promise<T>): Promise<T> => {
    const run = this.saveChain.then(task, task);
    this.saveChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  /**
   * Save the active page to the server. Resolves `true` when the server holds
   * everything the doc contained at plan time — which also covers "nothing to
   * save" (empty diff, empty map, no longer presenter, page already switched).
   * `false` means the content is still local-only.
   */
  private _saveRemoteNow = (options: { forceCheckpoint?: boolean } = {}): Promise<boolean> => {
    this.clearSaveTimers();
    this.flushAnnotations();

    const doc = this.doc;
    const elementsMap = this.elementsMap;
    if (!this.config || !doc || !elementsMap || !this.fileId) {
      return Promise.resolve(true);
    }
    if (!this.isCurrentUserPresenter() || elementsMap.size === 0) {
      return Promise.resolve(true);
    }

    const canonicalKey = this.pageKey(this.fileId, this.page);
    const forceCheckpoint = options.forceCheckpoint ?? false;
    // Planning happens inside the chain: the previous save is acked by then, so
    // this plan already covers every edit that coalesced while it was in flight.
    return this.enqueueSave(async () => {
      if (this.doc !== doc) {
        return true; // page switched; its teardown save covers this content
      }
      try {
        const state = this.getSyncState(canonicalKey);
        let update: Uint8Array;
        let key: string;
        let checkpointSV: Uint8Array | undefined;
        if (this.unconfirmedCanonicalKeys.has(canonicalKey)) {
          // Never overwrite a canonical we have not seen: ship the full state to
          // the ~d key instead (hydration applies canonical then ~d, and Yjs
          // merges). The checkpoint baseline stays untouched.
          update = Y.encodeStateAsUpdate(doc);
          key = diffKeyOf(canonicalKey);
        } else {
          const plan = state.planSave(doc, canonicalKey, { forceCheckpoint });
          if (plan.skipReason === 'empty-diff') {
            return true; // nothing changed since the last checkpoint
          }
          update = plan.update;
          key = plan.key;
          checkpointSV = plan.kind === 'checkpoint' ? plan.stateVector : undefined;
        }
        const wire = compress(update);
        if (wire.length > SESSION_DATA_MAX_WIRE_BYTES) {
          // Oversize: the NATS max_payload would reject it. Skip the send but
          // keep degradation safe (server keeps last good checkpoint; live peers
          // remain authoritative). We deliberately do NOT noteCheckpointUploaded
          // so the next flush retries the checkpoint rather than baselining diffs
          // against an upload the server never received.
          console.warn(
            `[WhiteboardController] SESSION_DATA payload for ${key} is too large (${wire.length} bytes); skipping upload`,
          );
          return false;
        }
        // Server is the source of truth for sync.
        const ok = await this.uploadSessionData(wire, key);
        if (ok && checkpointSV) {
          state.noteCheckpointUploaded(checkpointSV, wire.length);
        }
        return ok;
      } catch (e) {
        console.error('[WhiteboardController] failed to save page', e);
        return false;
      }
    });
  };

  /**
   * Save and, when unconfirmed while still on the same page, re-arm a backoff
   * retry instead of waiting for the next edit.
   */
  private saveWithRetry = async (forceCheckpoint = false) => {
    if (await this._saveRemoteNow({ forceCheckpoint })) {
      this.resetSaveRetry();
      return;
    }
    this.scheduleSaveRetry();
  };

  private resetSaveRetry = () => {
    this.saveRetryAttempt = 0;
    if (this.saveRetryTimer) {
      clearTimeout(this.saveRetryTimer);
      this.saveRetryTimer = null;
    }
  };

  private scheduleSaveRetry = () => {
    if (this.saveRetryTimer || !this.doc || !this.isCurrentUserPresenter()) return;
    const delay = Math.min(SAVE_RETRY_MAX_MS, SAVE_RETRY_BASE_MS * 2 ** this.saveRetryAttempt);
    this.saveRetryTimer = setTimeout(() => {
      this.saveRetryTimer = null;
      this.saveRetryAttempt++;
      void this.saveWithRetry();
    }, delay);
  };

  /**
   * Force-persist the active page before a page/file switch. Retries for up to
   * ~SAVE_FLUSH_TIMEOUT_MS; if still unconfirmed the content is stashed and
   * retried in the background so the switch can proceed without losing it.
   */
  flushBeforeSwitch = async (): Promise<boolean> => {
    const doc = this.doc;
    if (!doc || !this.isCurrentUserPresenter()) {
      return true; // nothing this user is allowed to persist
    }
    this.resetSaveRetry();
    // Only a page with pending changes needs a full checkpoint; a clean page
    // stays a no-op save.
    const forceCheckpoint = this.saveTimer !== null;
    const deadline = Date.now() + SAVE_FLUSH_TIMEOUT_MS;
    let ok = await this._saveRemoteNow({ forceCheckpoint });
    while (!ok && this.doc === doc && Date.now() < deadline) {
      const remaining = Math.max(0, deadline - Date.now());
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(SAVE_FLUSH_RETRY_DELAY_MS, remaining)),
      );
      if (this.doc !== doc || Date.now() >= deadline) break;
      ok = await this._saveRemoteNow({ forceCheckpoint });
    }
    if (ok) {
      await this.flushLocalSnapshot();
      return true;
    }
    this.stashPendingUpload(doc);
    return false;
  };

  /** Keep unconfirmed content of a page we are leaving and retry it in the background. */
  private stashPendingUpload = (doc: Y.Doc) => {
    const key = this.pageKey(this.fileId, this.page);
    this.pendingPageUploads.set(key, {
      update: Y.encodeStateAsUpdate(doc),
      stateVector: Y.encodeStateVector(doc),
      unconfirmed: this.unconfirmedCanonicalKeys.has(key),
    });
    this.schedulePendingUploadRetry(key);
  };

  private schedulePendingUploadRetry = (key: string, attempt = 0) => {
    if (!this.isCurrentUserPresenter()) {
      // Not authoritative any more: never overwrite the new presenter's state.
      this.pendingPageUploads.delete(key);
      return;
    }
    const existing = this.pendingUploadTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    const delay = Math.min(SAVE_RETRY_MAX_MS, SAVE_RETRY_BASE_MS * 2 ** attempt);
    const timer = setTimeout(() => {
      this.pendingUploadTimers.delete(key);
      void this.retryPendingUpload(key, attempt);
    }, delay);
    this.pendingUploadTimers.set(key, timer);
  };

  /** Upload stashed page content (through the save chain) until the server acks it. */
  private retryPendingUpload = async (key: string, attempt: number) => {
    const pending = this.pendingPageUploads.get(key);
    if (!pending) {
      return;
    }
    if (!this.isCurrentUserPresenter()) {
      this.pendingPageUploads.delete(key);
      return;
    }
    const wire = compress(pending.update);
    const ok = await this.enqueueSave(() =>
      this.uploadSessionData(wire, pending.unconfirmed ? diffKeyOf(key) : key),
    );
    if (this.pendingPageUploads.get(key) !== pending) {
      return; // hydration superseded it with a newer checkpoint
    }
    if (!ok) {
      this.schedulePendingUploadRetry(key, attempt + 1);
      return;
    }
    this.pendingPageUploads.delete(key);
    if (!pending.unconfirmed) {
      this.getSyncState(key).noteCheckpointUploaded(pending.stateVector, wire.length);
    }
  };

  /**
   * Unconditionally persist the active (fileId, page) scope from the live doc
   * to the local IDB export cache.
   */
  flushLocalSnapshot = async () => {
    if (!this.isCurrentUserPresenter() || !this.doc || !this.fileId) return;
    await saveWhiteboardPageSnapshot(this.fileId, this.page, Y.encodeStateAsUpdate(this.doc));
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
    this.saveTimer = setTimeout(async () => {
      this.saveTimer = null;
      // Server protocol save first, then mirror the live doc into the local IDB
      // export cache so it always holds current data during active editing.
      try {
        await this.saveWithRetry();
        await this.flushLocalSnapshot();
      } catch (e) {
        console.error('[WhiteboardController] scheduled save failed', e);
      }
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

  /**
   * Send a SESSION_DATA save and resolve `true` only once the server acks it
   * (SESSION_DATA_SAVE_RESPONSE echoes our requestId). No NATS connection,
   * encryption failure and a missed ack all resolve `false`.
   */
  uploadSessionData = async (
    update: Uint8Array,
    key: string,
    targetRoomId?: string,
  ): Promise<boolean> => {
    const conn = getNatsConn();
    if (!conn || !this.fileId) return false;
    let value = update;
    if (conn.enableE2EE) {
      const enc = await conn.encryptData(update);
      if (typeof enc === 'undefined') return false;
      value = enc;
    }
    const requestId = crypto.randomUUID();
    const acked = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.saveAckWaiters.delete(requestId);
        resolve(false);
      }, SAVE_ACK_TIMEOUT_MS);
      this.saveAckWaiters.set(requestId, { resolve, timer });
    });
    conn.sendMessageToCoreWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.SESSION_DATA_SAVE,
        msg: toJsonString(
          SessionDataHeaderSchema,
          create(SessionDataHeaderSchema, {
            dataType: SessionDataType.WHITEBOARD,
            key,
            requestId,
            ...(targetRoomId ? { targetRoomId } : {}),
          }),
        ),
        binMsg: value,
      }),
    );
    return acked;
  };

  /** Resolve the save waiters for a SESSION_DATA_SAVE_RESPONSE (header only). */
  handleSessionDataSaveResponse = (header: SessionDataHeader) => {
    const requestId = header.requestId;
    if (!requestId) return;
    const waiter = this.saveAckWaiters.get(requestId);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    this.saveAckWaiters.delete(requestId);
    waiter.resolve(header.success === true);
  };

  /**
   * Fetch a session-data value from the server. Resolves `true` once a response
   * arrives — including an EMPTY response, which legitimately confirms the key
   * is absent (e.g. a fresh page). Resolves `false` on timeout or when there is
   * no NATS connection. `handleSessionDataResponse` applies the response before
   * resolving the waiter, so awaiting the canonical key guarantees the base
   * snapshot is in the doc before the rolling diff is requested/applied.
   */
  fetchSessionData = (key: string): Promise<boolean> => {
    // Single-flight per key: a concurrent caller must not overwrite the first
    // caller's waiter (whose timeout would then delete the newer one).
    const inFlight = this.sessionDataFetches.get(key);
    if (inFlight) {
      return inFlight;
    }

    const promise = new Promise<boolean>((resolve) => {
      const conn = getNatsConn();
      if (!conn) {
        resolve(false);
        return;
      }
      const timer = setTimeout(() => {
        this.sessionDataWaiters.delete(key);
        resolve(false);
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
    }).finally(() => {
      // Only drop our own entry: a newer fetch may already have registered.
      if (this.sessionDataFetches.get(key) === promise) {
        this.sessionDataFetches.delete(key);
      }
    });

    this.sessionDataFetches.set(key, promise);
    return promise;
  };

  handleSessionDataResponse = (header: SessionDataHeader, value: Uint8Array) => {
    if (header.dataType !== SessionDataType.WHITEBOARD) return;
    const key = header.key;
    if (!key) return;

    const doc = this.doc;
    // Treat diff keys as active: compare against the canonical key so a diff
    // response still applies to the live doc, but resolve the waiter by the
    // literal (possibly diff) key.
    const isActive = !!doc && canonicalKeyOf(key) === this.pageKey(this.fileId, this.page);

    const resolveWaiter = () => {
      const waiter = this.sessionDataWaiters.get(key);
      if (waiter) {
        clearTimeout(waiter.timer);
        this.sessionDataWaiters.delete(key);
        // A response arrived (even if empty — the server confirmed the key is
        // absent). Empty-but-present counts as "confirmed", so resolve(true).
        waiter.resolve(true);
      }
    };

    if (value && value.length > 0) {
      // apply the active page live as a raw Yjs update (never decode+rebuild)
      if (doc && isActive) {
        // Shared path: also detects missing dependencies and triggers resync.
        this.applyRemoteUpdate(value);
        if (!isDiffKey(key) && this.unconfirmedCanonicalKeys.has(key)) {
          // Late-arriving canonical for a page we marked unconfirmed: the doc
          // is now complete — persist a fresh checkpoint and push the full
          // state so everyone converges.
          this.confirmCanonical(key);
          void this.saveWithRetry(true);
          this.broadcastFullState();
        }
      }
      // Never persist `~d` (diff) keys to IndexedDB — they would pollute
      // listWhiteboardPages / peer-serving. Canonical responses keep their
      // (already decompressed) value cached for export.
      if (!isDiffKey(key)) {
        void idbStore(DB_STORE_NAMES.WHITEBOARD, key, value).then(resolveWaiter, resolveWaiter);
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
    await Promise.all(missing.map((page) => this.fetchSessionData(this.pageKey(fileId, page))));
  };

  /** Mark a page's canonical snapshot as confirmed and stop retrying it. */
  private confirmCanonical = (key: string) => {
    this.unconfirmedCanonicalKeys.delete(key);
    const timer = this.canonicalRetryTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.canonicalRetryTimers.delete(key);
    }
  };

  /**
   * A canonical snapshot that never arrived leaves the page stuck (saves and
   * full-state broadcasts stay paused). Retry with backoff while the same page
   * is active and its canonical is still unconfirmed.
   */
  private scheduleCanonicalRetry = (key: string, attempt = 0) => {
    const existing = this.canonicalRetryTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    const delay = Math.min(CANONICAL_RETRY_MAX_MS, CANONICAL_RETRY_BASE_MS * 2 ** attempt);
    const timer = setTimeout(() => {
      this.canonicalRetryTimers.delete(key);
      void this.retryCanonical(key, attempt);
    }, delay);
    this.canonicalRetryTimers.set(key, timer);
  };

  private retryCanonical = async (key: string, attempt: number) => {
    if (!this.doc || key !== this.pageKey(this.fileId, this.page)) {
      return;
    }
    if (!this.unconfirmedCanonicalKeys.has(key)) {
      return;
    }

    const arrived = await this.fetchSessionData(key);
    if (!this.doc || key !== this.pageKey(this.fileId, this.page)) {
      return;
    }

    if (arrived) {
      // A non-empty response was already handled by handleSessionDataResponse;
      // this covers the late EMPTY case, where nothing was applied.
      if (this.unconfirmedCanonicalKeys.has(key)) {
        this.confirmCanonical(key);
        void this.saveWithRetry(true);
        this.broadcastFullState();
      }
      return;
    }

    if (this.unconfirmedCanonicalKeys.has(key)) {
      this.scheduleCanonicalRetry(key, attempt + 1);
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
              console.error('[WhiteboardController] failed to decompress scene update', e);
              break;
            }
          }
          this.applyRemoteUpdate(payload);
        } else if (scope?.fileId && typeof scope.page === 'number') {
          if (this.isCurrentUserPresenter()) {
            if (this.doc) {
              this.nudgeStalePeer(fromUserId, scope);
            }
          } else if (this.isUserPresenter(fromUserId)) {
            // The presenter switched while we missed the page/file message:
            // adopt the authorized scope; the Redux watcher re-runs navigation.
            const currentStore = this.storeScope();
            if (currentStore.fileId !== scope.fileId) {
              store.dispatch(
                updateCurrentWhiteboardOfficeFileId({ fileId: scope.fileId, page: scope.page }),
              );
            } else if (currentStore.page !== scope.page) {
              store.dispatch(setWhiteboardCurrentPage(scope.page));
            }
          }
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
    this.detectMissingUpdates();
  };

  /**
   * Yjs parks updates whose causal dependencies are missing in the doc store
   * (`pendingStructs`/`pendingDs`); they stay unintegrated until an earlier
   * update arrives, so ask the room for the missing history. Throttled: a
   * burst of out-of-order updates must not turn into a request storm.
   */
  private detectMissingUpdates = () => {
    const docStore = this.doc?.store;
    if (!docStore) {
      return;
    }
    if (!docStore.pendingStructs && !docStore.pendingDs) {
      this.missingUpdateResyncs = 0; // everything integrated again
      return;
    }
    // Initial handshake in flight: sendSyncRequest() would clear
    // pendingSyncRequestIds and reject its response, so let the handshake
    // deliver the missing history instead.
    if (this.initialRequestResolver) {
      return;
    }
    const now = Date.now();
    if (
      this.missingUpdateResyncs >= MAX_MISSING_UPDATE_RESYNCS ||
      now - this.lastMissingUpdateResyncAt < MISSING_UPDATE_RESYNC_THROTTLE_MS
    ) {
      return;
    }
    this.lastMissingUpdateResyncAt = now;
    this.missingUpdateResyncs += 1;
    console.warn(
      '[WhiteboardController] remote update is missing earlier updates; requesting a resync',
    );
    this.syncRequestAttempts = 0;
    this.sendSyncRequest();
  };

  /**
   * Anti-entropy: every ~25s (±5s) hand our state vector to a single peer so
   * a dropped update heals without user action. One peer per tick keeps the
   * cost flat in large rooms.
   */
  private scheduleAntiEntropy = () => {
    if (this.antiEntropyTimer) {
      clearTimeout(this.antiEntropyTimer);
    }
    const jitter = Math.round((Math.random() * 2 - 1) * ANTI_ENTROPY_JITTER_MS);
    this.antiEntropyTimer = setTimeout(() => {
      this.antiEntropyTimer = null;
      this.runAntiEntropyTick();
    }, ANTI_ENTROPY_INTERVAL_MS + jitter);
  };

  private runAntiEntropyTick = () => {
    if (!this.doc) {
      return;
    }
    this.scheduleAntiEntropy();

    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    // Never compete with the initial handshake or an in-flight sync.
    if (this.pendingSyncRequestIds.size > 0 || this.initialRequestResolver) {
      return;
    }

    this.syncRequestAttempts = 0;
    this.sendSyncRequest(1);
  };

  private sendSyncRequest = (maxTargets?: number) => {
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
    const recipients = maxTargets === undefined ? targets : targets.slice(0, maxTargets);
    const stateVector = Y.encodeStateVector(doc);
    for (const toUserId of recipients) {
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

    const defaultRoomLock = state.session.currentRoom.metadata?.defaultLockSettings?.lockWhiteboard;

    return participantsSelector
      .selectAll(state)
      .filter((p) => p.userId !== currentUserId && p.isOnline && !p.metadata?.waitForApproval)
      .sort((a, b) => {
        const presenterDiff = (b.metadata?.isPresenter ? 1 : 0) - (a.metadata?.isPresenter ? 1 : 0);
        if (presenterDiff !== 0) {
          return presenterDiff;
        }
        const editDiff =
          (this.canParticipantEdit(b, defaultRoomLock) ? 1 : 0) -
          (this.canParticipantEdit(a, defaultRoomLock) ? 1 : 0);
        if (editDiff !== 0) {
          return editDiff;
        }
        const adminDiff = (b.metadata?.isAdmin ? 1 : 0) - (a.metadata?.isAdmin ? 1 : 0);
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

      // No presenter online: no peer can answer, so report the store scope and
      // let the caller hydrate from the server (no 4s timeout wait). The switch
      // itself stays inside the caller's navigation ownership.
      if (!this.hasPresenterOnline()) {
        resolve(this.storeScope());
        return;
      }

      // Single-flight: cancel any previous pending initial request.
      this.resolveInitialRequest(null);

      if (this.getSyncRequestTargets().length === 0) {
        resolve(null);
        return;
      }

      this.initialRequestResolver = resolve;
      this.initialRequestScope = this.storeScope();
      this.pendingSyncRequestIds.clear();

      const sendInitialRequest = () => {
        const emptyStateVector = Y.encodeStateVector(new Y.Doc());
        for (const toUserId of this.getSyncRequestTargets()) {
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
      };

      /*
       * A presenter that is still hydrating (setupDoc/fetchSessionData) cannot
       * answer the first request, so retry fast instead of waiting for the 4s
       * timeout. Earlier request ids stay pending: a late answer to any attempt
       * still resolves the bootstrap.
       */
      const scheduleRetry = () => {
        this.syncRetryTimer = setTimeout(() => {
          this.syncRetryTimer = null;
          if (!this.initialRequestResolver || this.isInitialBootstrapStale()) {
            return;
          }
          sendInitialRequest();
          scheduleRetry();
        }, INITIAL_REQUEST_RETRY_MS);
      };

      sendInitialRequest();
      scheduleRetry();

      this.initialRequestTimer = setTimeout(() => {
        this.resolveInitialRequest(null);
      }, INITIAL_REQUEST_TIMEOUT_MS);
    });
  };

  /** Scope currently authorized in Redux (presenter-driven for followers). */
  private storeScope = (): { fileId: string; page: number } => {
    const { currentWhiteboardOfficeFileId, currentPage } = store.getState().whiteboard;
    return { fileId: currentWhiteboardOfficeFileId, page: currentPage };
  };

  /** True when Redux was moved to a newer scope after the bootstrap was requested. */
  private isInitialBootstrapStale = (): boolean => {
    if (!this.initialRequestScope) {
      return false;
    }
    const scope = this.storeScope();
    return (
      scope.fileId !== this.initialRequestScope.fileId ||
      scope.page !== this.initialRequestScope.page
    );
  };

  private resolveInitialRequest = (data: { fileId: string; page: number } | null) => {
    this.initialRequestScope = null;
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
    const currentCanonicalKey = this.pageKey(this.fileId, this.page);
    if (this.unconfirmedCanonicalKeys.has(currentCanonicalKey)) {
      console.warn(
        `[WhiteboardController] skipping full-state broadcast for ${currentCanonicalKey}: canonical snapshot unconfirmed (partial hydration); retrying after the snapshot arrives`,
      );
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
      doc &&
      this.isCurrentUserPresenter() &&
      senderScope?.fileId &&
      typeof senderScope.page === 'number' &&
      !this.matchesActiveScope(senderScope)
    ) {
      // The requester is on a page/file the room has left; redirect it to the
      // live scope instead of serving a stale snapshot (works on empty pages).
      this.nudgeStalePeer(fromUserId, senderScope);
      return;
    }

    if (!senderScope || !senderScope.fileId || typeof senderScope.page !== 'number') {
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
      // A blank page is still authoritative for its presenter: answering with an
      // empty update plus the scope metadata is what tells a newly joined peer
      // where the room is, instead of leaving it without a response.
      if (doc && elementsMap && (elementsMap.size > 0 || this.isActiveScopeAuthoritative())) {
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
      (elementsMap.size > 0 || this.isActiveScopeAuthoritative())
    ) {
      responseUpdate = Y.encodeStateAsUpdate(doc, binMessage);

      responseMessage = this.buildScopeMessage({
        stateVector: uint8ToBase64(Y.encodeStateVector(doc)),
      });
    } else if (senderScope && senderScope.fileId && typeof senderScope.page === 'number') {
      const stored = await loadWhiteboardPageSnapshot(senderScope.fileId, senderScope.page);

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

    const hasInitialData = typeof scope.initial_data === 'string' && scope.initial_data.length > 0;

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
      let initialData: WhiteboardDataAsDonorData;
      try {
        initialData = JSON.parse(scope.initial_data!) as WhiteboardDataAsDonorData;
      } catch (error) {
        console.error('[WhiteboardController] failed to parse initial whiteboard data', error);
        return;
      }

      // A newer presenter-authorized scope arrived while this bootstrap was in
      // flight: bootstrapping the donor would drag everyone back to the old
      // page. Hand the newest scope to the caller instead.
      if (this.isInitialBootstrapStale()) {
        this.resolveInitialRequest(this.storeScope());
        return;
      }

      donorFileId = initialData.currentWhiteboardOfficeFileId;
      donorPage = initialData.currentPageNumber;

      store.dispatch(addWhiteboardDataSentFromDonor(initialData));

      // The donor setup shares the serialized doc lifecycle with page/file
      // switches, and is dropped when a newer authorized scope won the race
      // while it waited in the chain.
      let donorScopeReady = false;
      await this.enqueueSyncStep(async () => {
        const scope = this.storeScope();
        if (scope.fileId !== donorFileId || scope.page !== donorPage) {
          return;
        }
        await this.setupDoc(donorFileId, donorPage);
        donorScopeReady = true;
      });

      if (!donorScopeReady) {
        this.resolveInitialRequest(this.storeScope());
        return;
      }

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
          console.error('[WhiteboardController] failed to decompress sync response', e);
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
        console.error('[WhiteboardController] failed to process responder state vector', error);
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
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
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
      console.error('[WhiteboardController] failed to apply remote awareness', e);
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
