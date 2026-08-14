import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import { DataChannelMessage, DataMsgBodyType } from 'plugnmeet-protocol-js';

import { getNatsConn } from '../../helpers/nats';
import { getNotepadDBName } from '../../helpers/libs/idb';
import { store } from '../../store';

const REMOTE_ORIGIN = 'nats-remote';
const FRAGMENT_NAME = 'document-store';
const SYNC_RETRY_DELAY = 2000;

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

export type NotepadSnapshot = {
  doc: Y.Doc | null;
  fragment: Y.XmlFragment | null;
  awareness: Awareness | null;
  generation: number;
  notePadId: string;
};

export class NotepadController {
  private doc: Y.Doc | null = null;
  private persistence: IndexeddbPersistence | null = null;
  private awareness: Awareness | null = null;
  private fragment: Y.XmlFragment | null = null;
  private notePadId = '';
  private dbName = '';
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
      await this.clearCurrentSession();
      this.notePadId = notePadId;
      this.dbName = getNotepadDBName(notePadId);

      const doc = new Y.Doc();
      const persistence = new IndexeddbPersistence(this.dbName, doc);
      await persistence.whenSynced;
      await persistence.set('lastAccessed', Date.now());

      const awareness = new Awareness(doc);
      const fragment = doc.getXmlFragment(FRAGMENT_NAME);

      this.doc = doc;
      this.persistence = persistence;
      this.awareness = awareness;
      this.fragment = fragment;
      this.generation++;

      doc.on('update', (update: Uint8Array, origin: unknown) => {
        // Keep the notepad DB "alive" on activity so long-running sessions
        // are not considered stale by cleanupStaleDBs.
        void persistence.set('lastAccessed', Date.now());
        if (origin === REMOTE_ORIGIN) {
          return;
        }
        this.send(DataMsgBodyType.NOTEPAD_UPDATE, update);
      });

      awareness.on('update', ({ added, updated, removed }, origin: unknown) => {
        if (origin === REMOTE_ORIGIN) {
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

    if (this.persistence) {
      await this.persistence.clearData();
      this.persistence = null;
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
    this.dbName = '';
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
  ) {
    const conn = getNatsConn();
    if (!conn) {
      return;
    }
    void conn.sendNotepadData(
      type,
      binMessage,
      id ?? crypto.randomUUID(),
      message,
    );
  }

  private sendSyncRequest() {
    if (!this.doc) {
      return;
    }
    const requestId = crypto.randomUUID();
    this.pendingSyncRequestId = requestId;
    this.send(
      DataMsgBodyType.NOTEPAD_SYNC_REQUEST,
      Y.encodeStateVector(this.doc),
      requestId,
    );

    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
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
