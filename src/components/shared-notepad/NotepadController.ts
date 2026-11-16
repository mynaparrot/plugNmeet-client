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
} from '../../helpers/collab-sync/sessionDataSync';
import { SessionDataClient } from '../../helpers/collab-sync/sessionDataClient';
import {
  ANTI_ENTROPY_INTERVAL_MS,
  ANTI_ENTROPY_JITTER_MS,
  SequentialSyncRequest,
} from '../../helpers/collab-sync/sequentialSyncRequest';
import { store } from '../../store';
import { participantsSelector } from '../../store/slices/participantSlice';
import { base64ToUint8, isUserRecorder, uint8ToBase64 } from '../../helpers/utils';

const REMOTE_ORIGIN = 'nats-remote';
// Origin of programmatic writes coming from outside the editor (see
// `applyExternalWrite`). Those writes are allowed to bypass `canWrite()`.
const EXTERNAL_WRITE_ORIGIN = 'local-external-write';
const FRAGMENT_NAME = 'document-store';
// Lives in the same Y.Doc, so the authorship of every externally written block
// syncs to all peers and survives a reload or a delegate switch.
const EXTERNAL_BLOCKS_MAP = 'external-block-authors';
const MAX_SYNC_TARGETS = 3;
export const NOTEPAD_SNAPSHOT_KEY = 'snapshot';

export type NotepadExternalWriteMode = 'replace' | 'append' | 'insert_section' | 'replace_block';

export interface NotepadExternalWriteRequest {
  mode: NotepadExternalWriteMode;
  markdown: string;
  heading?: string;
  /** Required for `replace_block`: the block to rewrite in place. */
  blockId?: string;
}

export interface NotepadExternalWriteResult {
  ok: boolean;
  length: number;
  error?: string;
}

/** A block an external write produced, with its normalized plain text. */
export interface NotepadExternalBlockRef {
  id: string;
  text: string;
}

export interface NotepadBlockSummary {
  id: string;
  type: string;
  text: string;
  markdown: string;
  author: 'external' | 'participant';
  /** The externally written text when the participant has since edited it. */
  originalText?: string;
}

export interface NotepadContentSnapshot {
  markdown: string;
  blocks: NotepadBlockSummary[];
  externalBlocks: NotepadBlockSummary[];
  participantBlocks: NotepadBlockSummary[];
}

export type NotepadContentReader = () => NotepadContentSnapshot;

/**
 * Applies an external write to the live document. Registered by the editor,
 * which owns the markdown -> block conversion and the ProseMirror schema.
 * Returns the blocks it produced so their authorship can be recorded.
 */
export type NotepadExternalWriteApplier = (
  request: NotepadExternalWriteRequest,
) => NotepadExternalBlockRef[];

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
  private readonly syncRequest = new SequentialSyncRequest({
    getTargets: () => this.getSyncRequestTargets(),
    send: (toUserId, requestId) => {
      const doc = this.doc;
      if (!doc) return;
      this.send(
        DataMsgBodyType.NOTEPAD_SYNC_REQUEST,
        Y.encodeStateVector(doc),
        requestId,
        undefined,
        toUserId,
      );
    },
  });
  private settingUp = false;
  private boundConn = false;
  private boundVisibility = false;
  private antiEntropyTimer: ReturnType<typeof setTimeout> | null = null;
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
  private contentChangeListeners = new Set<() => void>();
  private externalWriteApplier: NotepadExternalWriteApplier | null = null;
  private externalBlocksMap: Y.Map<string> | null = null;
  private contentReader: NotepadContentReader | null = null;
  // true while an external write is being applied, so the update handler
  // broadcasts it and the save path ignores the presenter/admin guard
  private externalWriteActive = false;
  // Set once the initial hydration has been applied, so the update handler does
  // not report our own catch-up as participant activity.
  private hydrationSettled = false;
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

  /** Called by the editor when it mounts/unmounts. */
  setExternalWriteApplier = (applier: NotepadExternalWriteApplier | null) => {
    this.externalWriteApplier = applier;
  };

  /** Called by the editor when it mounts/unmounts. */
  setContentReader = (reader: NotepadContentReader | null) => {
    this.contentReader = reader;
  };

  /**
   * Whether an external write can land right now: the CRDT doc is live and the
   * lazily mounted editor has registered its applier.
   */
  isReadyForExternalWrite = (): boolean => Boolean(this.doc && this.externalWriteApplier);

  /** Same, for callers that only need to read the content. */
  isReadyForExternalRead = (): boolean => Boolean(this.doc && this.contentReader);

  readContent = (): NotepadContentSnapshot | null =>
    this.contentReader ? this.contentReader() : null;

  /** The text an external writer put in this block, or null if it never wrote it. */
  getExternalBlockText = (blockId: string): string | null =>
    this.externalBlocksMap?.get(blockId) ?? null;

  /** Whether an external writer produced this block (the participant may have edited it since). */
  isExternalBlock = (blockId: string): boolean => Boolean(this.externalBlocksMap?.has(blockId));

  /**
   * Fires when the notepad changed from anywhere but an external write: a local
   * edit or an update pushed by another peer.
   */
  onParticipantContentChange = (listener: () => void): (() => void) => {
    this.contentChangeListeners.add(listener);
    return () => {
      this.contentChangeListeners.delete(listener);
    };
  };

  private notifyParticipantContentChange = () => {
    this.contentChangeListeners.forEach((cb) => cb());
  };

  /**
   * Writes markdown into the document on behalf of an external caller. The
   * whole edit happens in a single Y transaction and bypasses `canWrite()`,
   * because the caller was allowed to write by the room (a locked notepad
   * still stays locked for the participant's own input).
   */
  applyExternalWrite = (
    mode: NotepadExternalWriteMode,
    markdown: string,
    heading?: string,
    blockId?: string,
  ): NotepadExternalWriteResult => {
    if (!this.doc) {
      return { ok: false, length: 0, error: 'The shared notepad is not active right now.' };
    }
    if (!this.externalWriteApplier) {
      return { ok: false, length: 0, error: 'The shared notepad editor is not open right now.' };
    }

    const targetBlockId = blockId?.trim();
    try {
      this.externalWriteActive = true;
      this.doc.transact(() => {
        if (mode === 'replace') {
          this.externalBlocksMap?.clear();
        }
        const written =
          this.externalWriteApplier?.({ mode, markdown, heading, blockId: targetBlockId }) ?? [];
        // An in-place rewrite that touched nothing means the id is stale.
        if (mode === 'replace_block' && written.length === 0) {
          throw new Error(
            `block_id "${targetBlockId ?? ''}" was not found in the shared notepad. Call notepad_read first.`,
          );
        }
        for (const block of written) {
          this.externalBlocksMap?.set(block.id, block.text);
        }
      }, EXTERNAL_WRITE_ORIGIN);
    } catch (e) {
      console.error('[NotepadController] external write failed', e);
      return { ok: false, length: 0, error: (e as Error).message || 'write failed' };
    } finally {
      this.externalWriteActive = false;
    }

    // An external write must survive a reload even when the local user is
    // neither presenter nor admin, so persistence is forced here.
    void this.saveNow(true, true);
    return { ok: true, length: markdown.length };
  };

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
      this.externalBlocksMap = doc.getMap<string>(EXTERNAL_BLOCKS_MAP);
      this.generation++;

      doc.on('update', (update: Uint8Array, origin: unknown) => {
        this.scheduleSave();
        if (
          this.hydrationSettled &&
          origin !== EXTERNAL_WRITE_ORIGIN &&
          !this.externalWriteActive
        ) {
          this.notifyParticipantContentChange();
        }
        if (origin === REMOTE_ORIGIN) {
          return;
        }
        if (!this.canWrite() && !this.externalWriteActive) {
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
      this.syncRequest.start();
      this.scheduleAntiEntropy();
      this.hydrationSettled = true;
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
    this.syncRequest.cancel();
    this.clearAntiEntropy();
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
    this.externalBlocksMap = null;
    this.hydrationSettled = false;
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
  private saveNow = (forceCheckpoint = false, ignoreAccessGuard = false): Promise<boolean> => {
    this.clearSaveTimers();
    const doc = this.doc;
    if (!doc || !(ignoreAccessGuard || this.canAccessSessionData())) {
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

  /** Best-first sync targets: presenter, then admin, then regular users; recorders last. */
  private getSyncRequestTargets(): string[] {
    const state = store.getState();
    const currentUserId = state.session.currentUser?.userId;
    if (!currentUserId) {
      return [];
    }

    const rank = (p: {
      metadata?: { isPresenter?: boolean; isAdmin?: boolean };
      userId: string;
    }) => {
      if (isUserRecorder(p.userId)) return 3;
      if (p.metadata?.isPresenter) return 0;
      if (p.metadata?.isAdmin) return 1;
      return 2;
    };

    return participantsSelector
      .selectAll(state)
      .filter((p) => p.userId !== currentUserId && p.isOnline && !p.metadata?.waitForApproval)
      .sort((a, b) => rank(a) - rank(b) || a.joinedAt - b.joinedAt)
      .slice(0, MAX_SYNC_TARGETS)
      .map((p) => p.userId);
  }

  resync() {
    if (this.doc) {
      this.syncRequest.start();
    }
  }

  private clearAntiEntropy = () => {
    if (this.antiEntropyTimer) {
      clearTimeout(this.antiEntropyTimer);
      this.antiEntropyTimer = null;
    }
  };

  /**
   * Anti-entropy: every ~25s (±5s) ask one randomly chosen peer for what we are
   * missing, so a dropped update heals without user action.
   */
  private scheduleAntiEntropy = () => {
    this.clearAntiEntropy();
    const jitter = Math.round((Math.random() * 2 - 1) * ANTI_ENTROPY_JITTER_MS);
    this.antiEntropyTimer = setTimeout(() => {
      this.antiEntropyTimer = null;
      this.runAntiEntropyTick();
    }, ANTI_ENTROPY_INTERVAL_MS + jitter);
  };

  private runAntiEntropyTick = () => {
    if (!this.doc) {
      return; // torn down: the timer stays off
    }
    this.scheduleAntiEntropy();

    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    if (this.syncRequest.active) {
      return;
    }

    this.syncRequest.start(1, true);
  };

  private handleSyncRequest(payload: DataChannelMessage) {
    if (!this.doc || !payload.binMessage || !payload.fromUserId) {
      return;
    }
    const missing = Y.encodeStateAsUpdate(this.doc, payload.binMessage);
    const stateVector = uint8ToBase64(Y.encodeStateVector(this.doc));

    // NOTEPAD_SYNC_RESPONSE payloads are always compressed
    this.send(
      DataMsgBodyType.NOTEPAD_SYNC_RESPONSE,
      compress(missing),
      payload.id,
      JSON.stringify({ stateVector }),
      payload.fromUserId,
    );
  }

  private handleSyncResponse(payload: DataChannelMessage) {
    if (!this.doc || !this.syncRequest.isPending(payload.id)) {
      return;
    }

    // NOTEPAD_SYNC_RESPONSE is always compressed
    let update: Uint8Array | null = null;
    if (payload.binMessage && payload.binMessage.length > 0) {
      try {
        update = decompress(payload.binMessage);
      } catch (e) {
        console.error('[NotepadController] failed to decompress sync response', e);
        // This target's answer is unusable, so ask the next one right away.
        this.syncRequest.fail(payload.id);
        return;
      }
    }

    if (update) {
      Y.applyUpdate(this.doc, update, REMOTE_ORIGIN);
    }
    // Applied first: the next request's state vector already includes this answer.
    this.syncRequest.complete(payload.id);

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
