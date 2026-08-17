import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import { DataChannelMessage, DataMsgBodyType } from 'plugnmeet-protocol-js';

import { getNatsConn } from '../../helpers/nats';
import {
  DB_STORE_NAMES,
  idbDel,
  idbGet,
  idbStore,
} from '../../helpers/libs/idb';
import { store } from '../../store';
import { participantsSelector } from '../../store/slices/participantSlice';
import { base64ToUint8, uint8ToBase64 } from '../../helpers/utils';

const REMOTE_ORIGIN = 'nats-remote';
const FRAGMENT_NAME = 'document-store';
const SYNC_RETRY_DELAY = 2000;
const SAVE_DEBOUNCE_MS = 1000;
const NOTEPAD_SNAPSHOT_KEY = 'snapshot';

export type NotepadSnapshot = {
  doc: Y.Doc | null;
  fragment: Y.XmlFragment | null;
  awareness: Awareness | null;
  generation: number;
  notePadId: string;
};

export class NotepadController {
  private doc: Y.Doc | null = null;
  private awareness: Awareness | null = null;
  private fragment: Y.XmlFragment | null = null;
  private notePadId = '';
  private generation = 0;
  private pendingSyncRequestId: string | null = null;
  private backupResponseTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private syncRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private settingUp = false;
  private boundConn = false;
  private boundVisibility = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  private listeners = new Set<() => void>();
  private snapshot: NotepadSnapshot = {
    doc: null,
    fragment: null,
    awareness: null,
    generation: 0,
    notePadId: '',
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
      notePadId: this.notePadId,
    };
    this.emitChange();
  }

  private canWrite = () => {
    const user = store.getState().session.currentUser;
    if (!user) {
      return false;
    }
    return !user.isRecorder && !user.metadata?.lockSettings?.lockSharedNotepad;
  };

  private saveNow = async () => {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.doc) {
      return;
    }
    try {
      const update = Y.encodeStateAsUpdate(this.doc);
      await idbStore(DB_STORE_NAMES.NOTEPAD, NOTEPAD_SNAPSHOT_KEY, update);
    } catch (e) {
      console.error('[NotepadController] failed to save snapshot', e);
    }
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

  async sync() {
    const features =
      store.getState().session.currentRoom.metadata?.roomFeatures
        ?.sharedNotePadFeatures;
    if (
      !features ||
      !features.isAllow ||
      !features.isActive ||
      !features.notePadId
    ) {
      return;
    }
    if (this.notePadId === features.notePadId && this.doc) {
      return;
    }
    await this.setup(features.notePadId);
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

  private async setup(notePadId: string) {
    if (this.settingUp) {
      return;
    }
    this.settingUp = true;
    try {
      const previousNotePadId = this.notePadId;
      await this.clearCurrentSession();
      this.notePadId = notePadId;

      // On a server-driven reset the notePadId changes; discard the old
      // snapshot so stale content isn't reloaded and re-broadcast. Session-end
      // cleanup is handled by deleteRoomDB(), so this only runs on reset.
      if (previousNotePadId !== '' && previousNotePadId !== notePadId) {
        try {
          await idbDel(DB_STORE_NAMES.NOTEPAD, NOTEPAD_SNAPSHOT_KEY);
        } catch (e) {
          console.error('[NotepadController] failed to delete snapshot', e);
        }
      }

      const doc = new Y.Doc();

      try {
        const stored = await idbGet<Uint8Array>(
          DB_STORE_NAMES.NOTEPAD,
          NOTEPAD_SNAPSHOT_KEY,
        );
        if (stored instanceof Uint8Array && stored.length > 0) {
          Y.applyUpdate(doc, stored, REMOTE_ORIGIN);
        }
      } catch (e) {
        console.error('[NotepadController] failed to load snapshot', e);
      }

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
        this.send(
          DataMsgBodyType.NOTEPAD_AWARENESS,
          encodeAwarenessUpdate(awareness, changed),
        );
      });

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

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    if (this.awareness) {
      this.awareness.destroy();
      this.awareness = null;
    }
    if (this.doc) {
      this.doc.destroy();
      this.doc = null;
    }
    this.fragment = null;
    this.notePadId = '';
    this.updateSnapshot();
  }

  async destroy() {
    await this.teardown();
  }

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

    void conn.publishData(
      type,
      message,
      binMessage,
      id ?? crypto.randomUUID(),
      toUserId,
    );
  }

  private getSyncRequestTargets(): string[] {
    const state = store.getState();
    const currentUserId = state.session.currentUser?.userId;
    if (!currentUserId) {
      return [];
    }

    return participantsSelector
      .selectAll(state)
      .filter(
        (p) =>
          p.userId !== currentUserId &&
          p.isOnline &&
          !p.metadata?.waitForApproval,
      )
      .sort((a, b) => {
        const adminDiff =
          (b.metadata?.isAdmin ? 1 : 0) - (a.metadata?.isAdmin ? 1 : 0);
        if (adminDiff !== 0) {
          return adminDiff;
        }
        return a.joinedAt - b.joinedAt;
      })
      .slice(0, 3)
      .map((p) => p.userId);
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
      this.send(
        DataMsgBodyType.NOTEPAD_SYNC_REQUEST,
        stateVector,
        requestId,
        undefined,
        toUserId,
      );
    }

    this.syncRetryTimer = setTimeout(() => {
      if (this.pendingSyncRequestId === requestId && this.doc) {
        this.sendSyncRequest();
      }
    }, SYNC_RETRY_DELAY);
  }

  resync() {
    if (this.doc) {
      this.sendSyncRequest();
    }
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

  private applyRemoteAwareness(update: Uint8Array) {
    if (!this.awareness) {
      return;
    }
    applyAwarenessUpdate(this.awareness, update, REMOTE_ORIGIN);
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
      this.send(
        DataMsgBodyType.NOTEPAD_SYNC_RESPONSE,
        missing,
        requestId,
        JSON.stringify({ stateVector }),
      );
    };

    const isPresenter =
      store.getState().session.currentUser?.metadata?.isPresenter === true;

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

    if (payload.binMessage && payload.binMessage.length > 0) {
      Y.applyUpdate(this.doc, payload.binMessage, REMOTE_ORIGIN);
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
}

let instance: NotepadController | null = null;
export const getNotepadController = () => {
  if (!instance) {
    instance = new NotepadController();
  }
  return instance;
};
