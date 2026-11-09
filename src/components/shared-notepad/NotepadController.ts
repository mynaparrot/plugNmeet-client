import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import {
  DataChannelMessage,
  DataMsgBodyType,
  SessionDataType,
  SessionDataHeader,
} from 'plugnmeet-protocol-js';

import { getNatsConn } from '../../helpers/nats';
import {
  SESSION_DATA_MAX_WIRE_BYTES,
  SAVE_MAX_WAIT_MS,
  SAVE_RETRY_BASE_MS,
  SAVE_RETRY_MAX_MS,
  CANONICAL_RETRY_BASE_MS,
  CANONICAL_RETRY_MAX_MS,
  SessionDataSyncState,
  backoffDelay,
  diffKeyOf,
  isDiffKey,
  canonicalKeyOf,
  compress,
  decompress,
} from '../../helpers/libs/sessionDataSync';
import { SessionDataClient } from '../../helpers/libs/sessionDataClient';
import { store } from '../../store';
import { participantsSelector } from '../../store/slices/participantSlice';
import { base64ToUint8, uint8ToBase64 } from '../../helpers/utils';

const REMOTE_ORIGIN = 'nats-remote';
const FRAGMENT_NAME = 'document-store';
const SYNC_RETRY_DELAY = 2000;
export const NOTEPAD_SNAPSHOT_KEY = 'snapshot';

export type NotepadSnapshot = {
  doc: Y.Doc | null;
  fragment: Y.XmlFragment | null;
  awareness: Awareness | null;
  generation: number;
};

export class NotepadController {
  private doc: Y.Doc | null = null;
  private awareness: Awareness | null = null;
  private fragment: Y.XmlFragment | null = null;
  private generation = 0;
  private pendingSyncRequestId: string | null = null;
  private backupResponseTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private syncRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private settingUp = false;
  private boundConn = false;
  private boundVisibility = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saveChain: Promise<unknown> = Promise.resolve();
  private saveRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private saveRetryAttempt = 0;
  private readonly sessionData = new SessionDataClient(SessionDataType.NOTEPAD);
  // Per-document checkpoint + rolling-diff save decision state. The notepad has
  // a single document key, so a single state instance suffices. The baseline
  // resets to `null` on first save after hydration/rejoin naturally.
  private syncState = new SessionDataSyncState();
  // Only false when a canonical fetch was attempted and did not arrive, so the
  // server state is unknown and saves must not overwrite the canonical key.
  private snapshotConfirmed = true;
  private snapshotRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private snapshot: NotepadSnapshot = {
    doc: null,
    fragment: null,
    awareness: null,
    generation: 0,
  };

  private canWrite = () => {
    const state = store.getState();
    const user = state.session.currentUser;
    if (!user) {
      return false;
    }
    if (user.isRecorder) {
      return false;
    }
    if (user.metadata?.isAdmin) {
      return true;
    }
    const lock = user.metadata?.lockSettings?.lockSharedNotepad;
    if (typeof lock === 'boolean') {
      return !lock;
    }
    const defaultRoomLock =
      state.session.currentRoom.metadata?.defaultLockSettings?.lockSharedNotepad;
    return !(defaultRoomLock ?? true);
  };

  private canAccessSessionData = (): boolean => {
    const u = store.getState().session.currentUser;
    return !!u && (u.metadata?.isPresenter === true || u.metadata?.isAdmin === true);
  };

  /** Whether any online peer other than the current user is the presenter. */
  private hasPresenterOnline = (): boolean => {
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

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getSnapshot = (): NotepadSnapshot => this.snapshot;

  private emitChange = () => {
    this.listeners.forEach((cb) => cb());
  };

  private updateSnapshot() {
    this.snapshot = {
      doc: this.doc,
      fragment: this.fragment,
      awareness: this.awareness,
      generation: this.generation,
    };
    this.emitChange();
  }

  async sync() {
    const features =
      store.getState().session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures;
    if (!features || !features.isAllow || !features.isActive) {
      return;
    }
    if (this.doc) {
      return;
    }
    await this.setup();
  }

  private async setup() {
    if (this.settingUp) {
      return;
    }
    this.settingUp = true;
    try {
      await this.clearCurrentSession();
      // Default: nothing to hydrate means the canonical key is authoritative.
      this.snapshotConfirmed = true;

      const doc = new Y.Doc();
      const awareness = new Awareness(doc);
      const fragment = doc.getXmlFragment(FRAGMENT_NAME);

      this.doc = doc;
      this.awareness = awareness;
      this.fragment = fragment;
      this.generation++;

      doc.on('update', (update: Uint8Array, origin: unknown) => {
        this.scheduleSave();
        if (origin === REMOTE_ORIGIN || !this.canWrite()) {
          return;
        }
        this.send(DataMsgBodyType.NOTEPAD_UPDATE, update);
      });

      awareness.on('update', ({ added, updated, removed }, origin: unknown) => {
        if (origin === REMOTE_ORIGIN || !this.canWrite()) {
          return;
        }
        const changed = [...added, ...updated, ...removed];
        if (changed.length === 0) {
          return;
        }
        this.send(DataMsgBodyType.NOTEPAD_AWARENESS, encodeAwarenessUpdate(awareness, changed));
      });

      if (!this.hasPresenterOnline()) {
        // Fetch the canonical checkpoint FIRST, then the rolling diff — sequential
        // on purpose. handleSessionDataResponse applies each response before
        // resolving its waiter, so awaiting the canonical guarantees the base
        // snapshot is already in the doc before the diff is requested and applied.
        // (The server processes the two requests concurrently in a worker pool, so
        // parallel fetches can deliver the diff first.)
        let loaded = await this.sessionData.fetch(NOTEPAD_SNAPSHOT_KEY);
        if (!loaded) {
          // One retry — transient loss is plausible under the concurrent worker pool.
          loaded = await this.sessionData.fetch(NOTEPAD_SNAPSHOT_KEY);
        }
        await this.sessionData.fetch(diffKeyOf(NOTEPAD_SNAPSHOT_KEY));
        if (!loaded) {
          // A timed-out canonical fetch leaves the server state unknown, so saves
          // must stay off the canonical key until a response confirms it.
          this.snapshotConfirmed = false;
          console.warn(
            '[NotepadController] canonical snapshot did not arrive; saving to the diff key only (no checkpoint) until it arrives',
          );
          this.scheduleSnapshotRetry();
        }
      }

      this.updateSnapshot();
      this.bindLifecycle();
      this.sendSyncRequest();
    } finally {
      this.settingUp = false;
    }
  }

  private async teardown() {
    if (!this.settingUp) {
      await this.clearCurrentSession();
    }
  }

  async destroy() {
    await this.teardown();
  }

  private async clearCurrentSession() {
    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }
    for (const t of this.backupResponseTimers.values()) {
      clearTimeout(t);
    }
    this.backupResponseTimers.clear();
    this.pendingSyncRequestId = null;
    this.resetSaveRetry();

    const hadPendingSave = this.saveTimer !== null;
    this.clearSaveTimers();

    // Flush any pending save as a forced checkpoint before tearing down the doc
    // so the server keeps a consistent full state. Single attempt, no retry:
    // teardown must not wait for backoff. Oversize uploads are skipped inside
    // saveNow and do not block teardown.
    if (hadPendingSave) {
      await this.saveNow(true);
    }

    this.sessionData.cancelPendingFetches();
    this.clearSnapshotRetry();
    this.snapshotConfirmed = false;

    if (this.awareness) {
      this.awareness.destroy();
      this.awareness = null;
    }
    if (this.doc) {
      this.doc.destroy();
      this.doc = null;
    }
    this.fragment = null;
    this.updateSnapshot();
  }

  private bindLifecycle() {
    if (!this.boundConn) {
      const conn = getNatsConn();
      if (conn) {
        conn.onReconnect(() => this.resync());
        this.boundConn = true;
      }
    }
    if (!this.boundVisibility) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.resync();
        }
      });
      this.boundVisibility = true;
    }
  }

  private clearSaveTimers = () => {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
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
   * Save the notepad to the server. Resolves `true` when the server holds
   * everything the doc contained at plan time — which also covers "nothing to
   * save" (empty diff, no access). `false` means the content is still
   * local-only.
   */
  private saveNow = (forceCheckpoint = false): Promise<boolean> => {
    this.clearSaveTimers();
    const doc = this.doc;
    if (!doc || !this.canAccessSessionData()) {
      return Promise.resolve(true);
    }
    // Planning happens inside the chain: the previous save is acked by then, so
    // this plan already covers every edit that coalesced while it was in flight.
    return this.enqueueSave(async () => {
      if (this.doc !== doc) {
        return true; // teardown already flushed this content
      }
      try {
        let update: Uint8Array;
        let key: string;
        let checkpointSV: Uint8Array | undefined;
        if (!this.snapshotConfirmed) {
          // Never overwrite a canonical we have not seen: ship the full state to
          // the ~d key instead (hydration applies canonical then ~d, and Yjs
          // merges). The checkpoint baseline stays untouched.
          update = Y.encodeStateAsUpdate(doc);
          key = diffKeyOf(NOTEPAD_SNAPSHOT_KEY);
        } else {
          const plan = this.syncState.planSave(doc, NOTEPAD_SNAPSHOT_KEY, { forceCheckpoint });
          if (plan.skipReason === 'empty-diff') {
            return true; // nothing changed since the last checkpoint
          }
          update = plan.update;
          key = plan.key;
          checkpointSV = plan.kind === 'checkpoint' ? plan.stateVector : undefined;
        }
        const wire = compress(update);
        if (wire.length > SESSION_DATA_MAX_WIRE_BYTES) {
          // Oversize: the NATS max_payload would reject it. Skip the send but keep
          // degradation safe (server keeps last good checkpoint; live peers remain
          // authoritative). We deliberately do NOT noteCheckpointUploaded so the
          // next flush retries the checkpoint rather than baselining diffs
          // against an upload the server never received. Notepad persists nothing
          // to IndexedDB, so there is no local cache to refresh either.
          console.warn(
            `[NotepadController] SESSION_DATA payload for ${key} is too large (${wire.length} bytes); skipping upload`,
          );
          return false;
        }
        // Notepad persists nothing to IndexedDB (server is the source of truth),
        // so neither checkpoints nor diffs are written locally.
        const ok = await this.uploadSessionData(wire, key);
        if (ok && checkpointSV) {
          this.syncState.noteCheckpointUploaded(checkpointSV, wire.length);
        }
        return ok;
      } catch (e) {
        console.error('[NotepadController] failed to save notepad', e);
        return false;
      }
    });
  };

  /** Save and, when still unconfirmed, re-arm a backoff retry instead of waiting for the next edit. */
  private saveWithRetry = async (forceCheckpoint = false) => {
    if (await this.saveNow(forceCheckpoint)) {
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
    if (this.saveRetryTimer || !this.doc || !this.canAccessSessionData()) return;
    const delay = backoffDelay(SAVE_RETRY_BASE_MS, SAVE_RETRY_MAX_MS, this.saveRetryAttempt);
    this.saveRetryTimer = setTimeout(() => {
      this.saveRetryTimer = null;
      this.saveRetryAttempt++;
      void this.saveWithRetry();
    }, delay);
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
      void this.saveWithRetry();
    }, SAVE_MAX_WAIT_MS);
  };

  uploadSessionData = (update: Uint8Array, key: string, targetRoomId?: string): Promise<boolean> =>
    this.sessionData.upload(update, key, targetRoomId);

  /** Resolve the save waiters for a SESSION_DATA_SAVE_RESPONSE (header only). */
  handleSessionDataSaveResponse = (header: SessionDataHeader) => {
    this.sessionData.handleSaveResponse(header);
  };

  fetchSessionData = (key: string = NOTEPAD_SNAPSHOT_KEY): Promise<boolean> =>
    this.sessionData.fetch(key);

  handleSessionDataResponse = (header: SessionDataHeader, value: Uint8Array) => {
    if (header.dataType !== SessionDataType.NOTEPAD) return;
    const key = header.key;
    if (!key) return;

    // Both the canonical 'snapshot' and its rolling diff 'snapshot~d' target the
    // single notepad document. Canonicalize so a diff response still applies to
    // the live doc. Notepad persists nothing to IndexedDB (server is the source
    // of truth), so diff keys are never written to a local cache.
    if (canonicalKeyOf(key) !== NOTEPAD_SNAPSHOT_KEY) return;

    if (value && value.length > 0) {
      // apply live if the doc already exists
      if (this.doc) {
        Y.applyUpdate(this.doc, value, REMOTE_ORIGIN);
      }
    }

    // Any response for the canonical key confirms the server state — an empty
    // one means the server holds no snapshot yet (same rule as the whiteboard).
    if (!isDiffKey(key)) {
      this.confirmSnapshot();
    }

    this.sessionData.resolveFetchWaiter(key);
  };

  /** Mark the canonical snapshot as confirmed and stop retrying it. */
  private confirmSnapshot = () => {
    this.snapshotConfirmed = true;
    this.clearSnapshotRetry();
  };

  private clearSnapshotRetry = () => {
    if (this.snapshotRetryTimer) {
      clearTimeout(this.snapshotRetryTimer);
      this.snapshotRetryTimer = null;
    }
  };

  /**
   * An unconfirmed canonical keeps saves off the canonical key. Retry with
   * backoff while the same doc is alive and still unconfirmed.
   */
  private scheduleSnapshotRetry = (attempt = 0) => {
    this.clearSnapshotRetry();
    const delay = backoffDelay(CANONICAL_RETRY_BASE_MS, CANONICAL_RETRY_MAX_MS, attempt);
    this.snapshotRetryTimer = setTimeout(() => {
      this.snapshotRetryTimer = null;
      void this.retrySnapshot(attempt);
    }, delay);
  };

  private retrySnapshot = async (attempt: number) => {
    const doc = this.doc;
    if (!doc || this.snapshotConfirmed) {
      return;
    }

    const arrived = await this.sessionData.fetch(NOTEPAD_SNAPSHOT_KEY);
    if (this.doc !== doc) {
      return; // doc torn down or replaced while the fetch was in flight
    }

    if (arrived) {
      // A response confirms the key; the doc now holds the server state, so
      // upload a checkpoint instead of waiting for the next edit.
      this.confirmSnapshot();
      void this.saveWithRetry(true);
      return;
    }

    if (!this.snapshotConfirmed) {
      this.scheduleSnapshotRetry(attempt + 1);
    }
  };

  private send(
    type: DataMsgBodyType,
    binMessage: Uint8Array,
    id?: string,
    message?: string,
    toUserId?: string,
  ) {
    const conn = getNatsConn();
    if (!conn) {
      return;
    }

    void conn.publishData(type, {
      message,
      binMessage,
      id: id ?? crypto.randomUUID(),
      to: toUserId,
    });
  }

  handleNotepadMessage(payload: DataChannelMessage) {
    const conn = getNatsConn();
    if (!conn || payload.fromUserId === conn.userId) {
      return;
    }
    if (!payload.binMessage || payload.binMessage.length === 0) {
      return;
    }

    switch (payload.type) {
      case DataMsgBodyType.NOTEPAD_UPDATE:
        this.applyRemoteUpdate(payload.binMessage);
        break;
      case DataMsgBodyType.NOTEPAD_AWARENESS:
        this.applyRemoteAwareness(payload.binMessage);
        break;
      case DataMsgBodyType.NOTEPAD_SYNC_REQUEST:
        this.handleSyncRequest(payload);
        break;
      case DataMsgBodyType.NOTEPAD_SYNC_RESPONSE:
        this.handleSyncResponse(payload);
        break;
      default:
        break;
    }
  }

  private applyRemoteUpdate(update: Uint8Array) {
    if (!this.doc) {
      return;
    }
    Y.applyUpdate(this.doc, update, REMOTE_ORIGIN);
  }

  private sendSyncRequest() {
    if (!this.doc) {
      return;
    }
    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }

    const targets = this.getSyncRequestTargets();
    if (targets.length === 0) {
      this.pendingSyncRequestId = null;
      return;
    }

    const requestId = crypto.randomUUID();
    this.pendingSyncRequestId = requestId;
    const stateVector = Y.encodeStateVector(this.doc);
    for (const toUserId of targets) {
      this.send(DataMsgBodyType.NOTEPAD_SYNC_REQUEST, stateVector, requestId, undefined, toUserId);
    }

    this.syncRetryTimer = setTimeout(() => {
      if (this.pendingSyncRequestId === requestId && this.doc) {
        this.sendSyncRequest();
      }
    }, SYNC_RETRY_DELAY);
  }

  private getSyncRequestTargets(): string[] {
    const state = store.getState();
    const currentUserId = state.session.currentUser?.userId;
    if (!currentUserId) {
      return [];
    }

    return participantsSelector
      .selectAll(state)
      .filter((p) => p.userId !== currentUserId && p.isOnline && !p.metadata?.waitForApproval)
      .sort((a, b) => {
        const adminDiff = (b.metadata?.isAdmin ? 1 : 0) - (a.metadata?.isAdmin ? 1 : 0);
        if (adminDiff !== 0) {
          return adminDiff;
        }
        return a.joinedAt - b.joinedAt;
      })
      .slice(0, 3)
      .map((p) => p.userId);
  }

  resync() {
    if (this.doc) {
      this.sendSyncRequest();
    }
  }

  private handleSyncRequest(payload: DataChannelMessage) {
    if (!this.doc || !payload.binMessage) {
      return;
    }
    const missing = Y.encodeStateAsUpdate(this.doc, payload.binMessage);
    const stateVector = uint8ToBase64(Y.encodeStateVector(this.doc));
    const requestId = payload.id;

    const respond = () => {
      const timer = this.backupResponseTimers.get(requestId);
      if (timer) {
        clearTimeout(timer);
        this.backupResponseTimers.delete(requestId);
      }
      // NOTEPAD_SYNC_RESPONSE payloads are always compressed
      this.send(
        DataMsgBodyType.NOTEPAD_SYNC_RESPONSE,
        compress(missing),
        requestId,
        JSON.stringify({ stateVector }),
      );
    };

    const isPresenter = store.getState().session.currentUser?.metadata?.isPresenter === true;

    if (isPresenter) {
      respond();
      return;
    }

    const delay = 250 + Math.floor(Math.random() * 550);
    const timer = setTimeout(respond, delay);
    this.backupResponseTimers.set(requestId, timer);
  }

  private handleSyncResponse(payload: DataChannelMessage) {
    const timer = this.backupResponseTimers.get(payload.id);
    if (timer) {
      clearTimeout(timer);
      this.backupResponseTimers.delete(payload.id);
    }

    if (payload.id !== this.pendingSyncRequestId || !this.doc) {
      return;
    }

    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }
    this.pendingSyncRequestId = null;

    // NOTEPAD_SYNC_RESPONSE is always compressed
    if (payload.binMessage && payload.binMessage.length > 0) {
      let update: Uint8Array;
      try {
        update = decompress(payload.binMessage);
      } catch (e) {
        console.error('[NotepadController] failed to decompress sync response', e);
        return;
      }
      Y.applyUpdate(this.doc, update, REMOTE_ORIGIN);
    }

    let stateVector: Uint8Array | null = null;
    try {
      const parsed = JSON.parse(payload.message || '{}');
      if (parsed.stateVector) {
        stateVector = base64ToUint8(parsed.stateVector);
      }
    } catch {
      stateVector = null;
    }

    if (stateVector) {
      const extra = Y.encodeStateAsUpdate(this.doc, stateVector);
      if (extra.length > 0) {
        this.send(DataMsgBodyType.NOTEPAD_UPDATE, extra);
      }
    }
  }

  private applyRemoteAwareness(update: Uint8Array) {
    if (!this.awareness) {
      return;
    }
    applyAwarenessUpdate(this.awareness, update, REMOTE_ORIGIN);
  }
}

let instance: NotepadController | null = null;
export const getNotepadController = () => {
  if (!instance) {
    instance = new NotepadController();
  }
  return instance;
};
