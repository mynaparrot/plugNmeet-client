import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';
import type { Collaborator, SocketId } from '@excalidraw/excalidraw/types';

import { store } from '../../../../store';
import { selectWhiteboardParticipants } from '../../../../store/slices/participantSlice';
import type { WhiteboardControllerConfig, WhiteboardPresence } from '../types';
import { WHITEBOARD_REMOTE_ORIGIN } from './constants';

type SendWhiteboardData = (type: DataMsgBodyType, binMessage: Uint8Array) => void;

/**
 * Room-scoped Yjs Awareness presence: publishes this client's cursor and renders
 * remote cursors as Excalidraw collaborators.
 */
export class WhiteboardPresenceManager {
  // separate from the page-scoped CRDT doc so cursor presence survives whiteboard page/file switches.
  private presenceDoc: Y.Doc | null = null;
  private awareness: Awareness | null = null;

  constructor(
    private readonly getConfig: () => WhiteboardControllerConfig | null,
    private readonly sendWhiteboardData: SendWhiteboardData,
  ) {}

  /** Idempotent: presence survives page/file switches and is only torn down in `destroy()`. */
  ensurePresence = () => {
    if (this.presenceDoc) {
      return;
    }
    const presenceDoc = new Y.Doc();
    const awareness = new Awareness(presenceDoc);
    awareness.on('change', this.handleAwarenessChange);
    this.presenceDoc = presenceDoc;
    this.awareness = awareness;
  };

  destroyPresence = () => {
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

  /** Only users who can write to the whiteboard publish presence. */
  setLocalPresence = (presence: WhiteboardPresence) => {
    if (this.getConfig()?.canWrite() && this.awareness) {
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

  /** Always refreshes the rendered collaborators first; remote updates are never re-broadcast. */
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
    const awareness = this.awareness;
    const config = this.getConfig();
    if (!awareness || !config || !config.canWrite()) {
      return;
    }
    this.sendWhiteboardData(
      DataMsgBodyType.POINTER_UPDATE,
      encodeAwarenessUpdate(awareness, changed),
    );
  };

  /**
   * Rebuilds the rendered `Map<SocketId, Collaborator>` from the awareness states.
   * Skips our own client id, states without a truthy `id`, and users who may not
   * draw: not presenting and locked out of the whiteboard.
   */
  private syncCollaborators = () => {
    const config = this.getConfig();
    const awareness = this.awareness;
    if (!config || !config.excalidrawAPI || !awareness) {
      return;
    }

    // `isPresent` is derived from the participant's isPresenter flag.
    const drawableIds = new Set(
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
      if (!drawableIds.has(id)) {
        return;
      }
      collaborators.set(id as SocketId, state as unknown as Collaborator);
    });

    config.excalidrawAPI.updateScene({ collaborators });
  };

  /** The remote origin is supplied so the `change` listener does not re-broadcast the update. */
  applyRemoteAwareness = (update: Uint8Array) => {
    if (!this.awareness) {
      return;
    }
    try {
      applyAwarenessUpdate(this.awareness, update, WHITEBOARD_REMOTE_ORIGIN);
    } catch (e) {
      console.error('[WhiteboardPresenceManager] failed to apply remote awareness', e);
    }
  };
}
