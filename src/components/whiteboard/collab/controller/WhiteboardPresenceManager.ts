import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';
import type { Collaborator, SocketId } from '@excalidraw/excalidraw/types';

import { store } from '../../../../store';
import { selectWhiteboardParticipants } from '../../../../store/slices/participantSlice';
import type { WhiteboardControllerConfig, WhiteboardPresence } from '../types';
import { WHITEBOARD_REMOTE_ORIGIN } from './constants';

type SendWhiteboardData = (type: DataMsgBodyType, binMessage: Uint8Array) => void;

type ExternalPointer = {
  x: number;
  y: number;
  tool?: 'laser' | 'pointer';
  button?: 'up' | 'down';
};

const DEFAULT_EXTERNAL_POINTER_COLOR = '#0b7285';

/**
 * Room-scoped Yjs Awareness presence: publishes this client's cursor and renders
 * remote cursors as Excalidraw collaborators.
 */
export class WhiteboardPresenceManager {
  // separate from the page-scoped CRDT doc so cursor presence survives whiteboard page/file switches.
  private presenceDoc: Y.Doc | null = null;
  private awareness: Awareness | null = null;
  // Presence of a non-human participant (the AI agent's pointer/laser) travels
  // from its own awareness client, so remote peers render it as an ordinary
  // collaborator and this client's own state is never touched.
  private externalPresenceDoc: Y.Doc | null = null;
  private externalAwareness: Awareness | null = null;
  private externalCollaboratorId: string | null = null;

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
    if (this.externalAwareness) {
      this.externalAwareness.off('change', this.handleExternalAwarenessChange);
      this.externalAwareness.destroy();
      this.externalAwareness = null;
    }
    if (this.externalPresenceDoc) {
      this.externalPresenceDoc.destroy();
      this.externalPresenceDoc = null;
    }
    this.externalCollaboratorId = null;
  };

  /**
   * Publishes (or, with `null`, retracts) the pointer of a collaborator that is
   * not a participant — e.g. the AI agent. Deliberately not gated by
   * `canWrite()`: pointing is presentation, not editing, and the caller decides
   * who may do it.
   */
  setExternalCollaboratorPointer = (
    id: string,
    name: string,
    pointer: ExternalPointer | null,
    color?: string,
  ) => {
    if (!pointer) {
      const awareness = this.externalAwareness;
      const previous = awareness?.getLocalState() as WhiteboardPresence | null;
      // A laser trail only stops on a button-up, so send that state first: it
      // ends the trail on every peer before the collaborator disappears.
      if (awareness && previous?.pointer) {
        awareness.setLocalState({ ...previous, button: 'up' });
      }
      awareness?.setLocalState(null);
      this.externalCollaboratorId = null;
      return;
    }

    this.ensurePresence();
    const awareness = this.ensureExternalAwareness();
    this.externalCollaboratorId = id;
    const stroke = color ?? DEFAULT_EXTERNAL_POINTER_COLOR;
    const tool = pointer.tool ?? 'laser';

    awareness.setLocalState({
      id,
      username: name,
      isExternal: true,
      pointer: {
        x: pointer.x,
        y: pointer.y,
        tool,
        // Cursor and name are always rendered; the laser trail needs them too.
        renderCursor: true,
        laserColor: stroke,
      },
      // Excalidraw only starts and extends a laser trail while the button is down.
      button: pointer.button ?? (tool === 'laser' ? 'down' : 'up'),
      selectedElementIds: {},
      color: { background: stroke, stroke },
    } satisfies WhiteboardPresence);
  };

  private ensureExternalAwareness = (): Awareness => {
    if (this.externalAwareness) {
      return this.externalAwareness;
    }
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    awareness.on('change', this.handleExternalAwarenessChange);
    this.externalPresenceDoc = doc;
    this.externalAwareness = awareness;
    return awareness;
  };

  /**
   * Mirrors the external pointer locally and broadcasts it as a normal
   * `POINTER_UPDATE`, so every peer sees the same cursor.
   */
  private handleExternalAwarenessChange = ({
    added,
    updated,
    removed,
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    const awareness = this.externalAwareness;
    if (!awareness) {
      return;
    }
    const changed = [...added, ...updated, ...removed];
    if (changed.length === 0) {
      return;
    }
    const update = encodeAwarenessUpdate(awareness, changed);
    if (this.awareness) {
      applyAwarenessUpdate(this.awareness, update, WHITEBOARD_REMOTE_ORIGIN);
    }
    this.sendWhiteboardData(DataMsgBodyType.POINTER_UPDATE, update);
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

    const externalIds = new Set(this.externalCollaboratorId ? [this.externalCollaboratorId] : []);

    const collaborators = new Map<SocketId, Collaborator>();
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) {
        return;
      }
      if (!state.id) {
        return;
      }
      const id = String(state.id);
      // The agent never owns a whiteboard permission flag, so it bypasses the
      // participant lock filter and is drawn for everyone that receives it.
      if (
        !drawableIds.has(id) &&
        !externalIds.has(id) &&
        !(state as WhiteboardPresence).isExternal
      ) {
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
