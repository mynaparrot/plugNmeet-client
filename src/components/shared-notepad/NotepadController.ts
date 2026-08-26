import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import { create, toJsonString } from '@bufbuild/protobuf';
import {
  DataChannelMessage,
  DataMsgBodyType,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
  SessionDataHeaderSchema,
  SessionDataType,
  SessionDataHeader,
} from 'plugnmeet-protocol-js';

import { getNatsConn } from '../../helpers/nats';
import { store } from '../../store';
import { participantsSelector } from '../../store/slices/participantSlice';
import { base64ToUint8, uint8ToBase64 } from '../../helpers/utils';

const REMOTE_ORIGIN = 'nats-remote';
const FRAGMENT_NAME = 'document-store';
const SYNC_RETRY_DELAY = 2000;
const SAVE_DEBOUNCE_MS = 1000;
const SERVER_FIRST_SYNC_TIMEOUT_MS = 1500;
const NOTEPAD_SNAPSHOT_KEY = 'snapshot';

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
  private backupResponseTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private syncRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private settingUp = false;
  private boundConn = false;
  private boundVisibility = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingServerSync = false;
  private serverFirstResolve: (() => void) | null = null;
  private serverFirstTimer: ReturnType<typeof setTimeout> | null = null;
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
      state.session.currentRoom.metadata?.defaultLockSettings
        ?.lockSharedNotepad;
    return !(defaultRoomLock ?? true);
  };

  private canAccessSessionData = (): boolean => {
    const u = store.getState().session.currentUser;
    return (
      !!u && (u.metadata?.isPresenter === true || u.metadata?.isAdmin === true)
    );
  };

  private waitForServerFirst = () =>
    new Promise<void>((resolve) => {
      this.serverFirstResolve = resolve;
      this.serverFirstTimer = setTimeout(() => {
        this.serverFirstTimer = null;
        this.serverFirstResolve = null;
        this.pendingServerSync = false;
        resolve();
      }, SERVER_FIRST_SYNC_TIMEOUT_MS);
    });

  private resolveServerFirst = () => {
    if (this.serverFirstTimer) {
      clearTimeout(this.serverFirstTimer);
      this.serverFirstTimer = null;
    }
    this.pendingServerSync = false;
    if (this.serverFirstResolve) {
      const resolve = this.serverFirstResolve;
      this.serverFirstResolve = null;
      resolve();
    }
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
      store.getState().session.currentRoom.metadata?.roomFeatures
        ?.sharedNotePadFeatures;
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
        this.send(
          DataMsgBodyType.NOTEPAD_AWARENESS,
          encodeAwarenessUpdate(awareness, changed),
        );
      });

      if (this.canAccessSessionData()) {
        this.pendingServerSync = true;
        this.fetchSessionData();
        await this.waitForServerFirst();
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
    this.pendingServerSync = false;
    if (this.serverFirstTimer) {
      clearTimeout(this.serverFirstTimer);
      this.serverFirstTimer = null;
    }
    this.serverFirstResolve = null;

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

  private saveNow = async () => {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.doc) {
      return;
    }
    if (!this.canAccessSessionData()) {
      return;
    }
    try {
      const update = Y.encodeStateAsUpdate(this.doc);
      // Server is the source of truth for sync.
      await this.uploadSessionData(update);
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

  uploadSessionData = async (update: Uint8Array) => {
    const conn = getNatsConn();
    if (!conn) return;
    let value = update;
    if (conn.enableE2EE) {
      const enc = await conn.encryptData(update);
      if (typeof enc === 'undefined') return;
      value = enc;
    }
    conn.sendMessageToSystemWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.SESSION_DATA_SAVE,
        msg: toJsonString(
          SessionDataHeaderSchema,
          create(SessionDataHeaderSchema, {
            dataType: SessionDataType.NOTEPAD,
            key: NOTEPAD_SNAPSHOT_KEY,
          }),
        ),
        binMsg: value,
      }),
    );
  };

  fetchSessionData = () => {
    const conn = getNatsConn();
    if (!conn) return;
    conn.sendMessageToSystemWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.SESSION_DATA_FETCH_REQUEST,
        msg: toJsonString(
          SessionDataHeaderSchema,
          create(SessionDataHeaderSchema, {
            dataType: SessionDataType.NOTEPAD,
            key: NOTEPAD_SNAPSHOT_KEY,
          }),
        ),
      }),
    );
  };

  handleSessionDataResponse = (
    header: SessionDataHeader,
    value: Uint8Array,
  ) => {
    if (header.dataType !== SessionDataType.NOTEPAD) return;

    if (value && value.length > 0) {
      // apply live if the doc already exists
      if (this.doc) {
        Y.applyUpdate(this.doc, value, REMOTE_ORIGIN);
      }
    }

    // Resolve the server-first wait when this is the response we were waiting
    // for. Empty responses still resolve it (server had no data).
    if (this.pendingServerSync) {
      this.resolveServerFirst();
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
