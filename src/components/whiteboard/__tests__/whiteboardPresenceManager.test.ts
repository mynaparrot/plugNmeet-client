import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';

import type { WhiteboardControllerConfig } from '../collab/types';

/*
 * Presence runs on a real Yjs Awareness: local changes must reach the room,
 * remote changes must never be echoed back, and teardown must leave nothing
 * behind. Only the store and the message transport are stubbed.
 */

const { storeState } = vi.hoisted(() => ({
  storeState: { current: {} as Record<string, unknown> },
}));

vi.mock('../../../store', () => ({
  store: { getState: () => storeState.current, dispatch: vi.fn() },
}));

import { WhiteboardPresenceManager } from '../collab/controller/WhiteboardPresenceManager';

type Person = { userId: string; presenter?: boolean; locked?: boolean };

/** Redux entity-adapter participant state, as the real selector expects it. */
const participantsState = (people: Person[]) => ({
  participants: {
    ids: people.map((p) => p.userId),
    entities: Object.fromEntries(
      people.map((p) => [
        p.userId,
        {
          userId: p.userId,
          name: p.userId,
          metadata: { isPresenter: !!p.presenter, lockSettings: { lockWhiteboard: !!p.locked } },
        },
      ]),
    ),
  },
});

type Harness = {
  manager: WhiteboardPresenceManager;
  send: ReturnType<typeof vi.fn>;
  updateScene: ReturnType<typeof vi.fn>;
  setCanWrite: (value: boolean) => void;
  awareness: () => Awareness | null;
  sentUpdate: (index: number) => Uint8Array;
};

const managers: WhiteboardPresenceManager[] = [];
const docs: Y.Doc[] = [];

const setup = (people: Person[], canWrite = true): Harness => {
  storeState.current = participantsState(people);
  const updateScene = vi.fn();
  const send = vi.fn();
  let writable = canWrite;
  const config: WhiteboardControllerConfig = {
    excalidrawAPI: { updateScene } as never,
    roomSid: 'room-1',
    onRemoteUpdate: () => undefined,
    canWrite: () => writable,
  };
  const manager = new WhiteboardPresenceManager(() => config, send);
  managers.push(manager);
  return {
    manager,
    send,
    updateScene,
    setCanWrite: (value) => {
      writable = value;
    },
    awareness: () => (manager as unknown as { awareness: Awareness | null }).awareness,
    sentUpdate: (index) => send.mock.calls[index][1] as Uint8Array,
  };
};

const newDoc = () => {
  const doc = new Y.Doc();
  docs.push(doc);
  return doc;
};

/** A second client whose awareness states are real wire payloads. */
const remotePeer = () => {
  const awareness = new Awareness(newDoc());
  return {
    awareness,
    publish: (state: Record<string, unknown> | null) => {
      awareness.setLocalState(state);
      return encodeAwarenessUpdate(awareness, [awareness.clientID]);
    },
  };
};

const collaboratorsOf = (harness: Harness) => {
  const calls = harness.updateScene.mock.calls as unknown as [
    { collaborators: Map<string, { id?: string }> },
  ][];
  const last = calls[calls.length - 1];
  return last?.[0].collaborators ?? new Map<string, { id?: string }>();
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  managers.splice(0).forEach((manager) => manager.destroyPresence());
  docs.splice(0).forEach((doc) => doc.destroy());
  vi.useRealTimers();
});

describe('WhiteboardPresenceManager', () => {
  it('creates one awareness instance and reuses it', () => {
    const harness = setup([]);

    harness.manager.ensurePresence();
    const first = harness.awareness();
    harness.manager.ensurePresence();

    expect(first).not.toBeNull();
    expect(harness.awareness()).toBe(first);
  });

  it('broadcasts every local presence update as a pointer update', () => {
    const harness = setup([{ userId: 'me' }]);
    harness.manager.ensurePresence();

    harness.manager.setLocalPresence({ id: 'me', pointer: { x: 1, y: 2, tool: 'pointer' } });
    harness.manager.setLocalPresence({ id: 'me', pointer: { x: 3, y: 4, tool: 'pointer' } });

    expect(harness.send).toHaveBeenCalledTimes(2);
    expect(harness.send.mock.calls[0][0]).toBe(DataMsgBodyType.POINTER_UPDATE);
    expect(harness.sentUpdate(1)).toBeInstanceOf(Uint8Array);

    // The payload carries the latest presence for a receiving client.
    const viewer = new Awareness(newDoc());
    applyAwarenessUpdate(viewer, harness.sentUpdate(1), 'remote');
    expect(viewer.getStates().get(harness.awareness()!.clientID)).toMatchObject({
      id: 'me',
      pointer: { x: 3, y: 4 },
    });
  });

  it('does not re-send an unchanged local presence', () => {
    const harness = setup([]);
    harness.manager.ensurePresence();
    const presence = { id: 'me', pointer: { x: 1, y: 2, tool: 'pointer' } };

    harness.manager.setLocalPresence(presence);
    harness.manager.setLocalPresence({ ...presence, pointer: { ...presence.pointer } });

    expect(harness.send).toHaveBeenCalledTimes(1);
  });

  it('keeps read-only users out of the awareness state', () => {
    const harness = setup([], false);
    harness.manager.ensurePresence();

    harness.manager.setLocalPresence({ id: 'me' });

    expect(harness.send).not.toHaveBeenCalled();
    expect(harness.updateScene).not.toHaveBeenCalled();
    // Awareness starts with an empty local state; read-only must leave it untouched.
    expect(harness.awareness()!.getLocalState()).toEqual({});

    harness.setCanWrite(true);
    harness.manager.setLocalPresence({ id: 'me' });
    expect(harness.send).toHaveBeenCalledTimes(1);
  });

  it('applies remote awareness without echoing it back', () => {
    const harness = setup([{ userId: 'peer1' }]);
    harness.manager.ensurePresence();
    const peer = remotePeer();

    harness.manager.applyRemoteAwareness(
      peer.publish({ id: 'peer1', username: 'Peer', pointer: { x: 5, y: 6, tool: 'pointer' } }),
    );

    expect(harness.send).not.toHaveBeenCalled();
    expect(Array.from(collaboratorsOf(harness).keys())).toEqual(['peer1']);
    expect(collaboratorsOf(harness).get('peer1')).toMatchObject({ id: 'peer1', username: 'Peer' });
  });

  it('renders no collaborator for itself or for states without an id', () => {
    const harness = setup([{ userId: 'me' }, { userId: 'peer1' }]);
    harness.manager.ensurePresence();
    harness.manager.setLocalPresence({ id: 'me' });

    harness.manager.applyRemoteAwareness(remotePeer().publish({ id: 'peer1' }));
    harness.manager.applyRemoteAwareness(remotePeer().publish({ username: 'anonymous' }));

    expect(Array.from(collaboratorsOf(harness).keys())).toEqual(['peer1']);
  });

  it('drops a remote collaborator once that client clears its presence', () => {
    const harness = setup([{ userId: 'peer1' }]);
    harness.manager.ensurePresence();
    const peer = remotePeer();
    harness.manager.applyRemoteAwareness(peer.publish({ id: 'peer1' }));
    expect(collaboratorsOf(harness).size).toBe(1);

    harness.manager.applyRemoteAwareness(peer.publish(null));

    expect(collaboratorsOf(harness).size).toBe(0);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it('filters out users who are no longer in the room', () => {
    const harness = setup([{ userId: 'peer1' }, { userId: 'peer2' }]);
    harness.manager.ensurePresence();
    harness.manager.applyRemoteAwareness(remotePeer().publish({ id: 'peer1' }));
    harness.manager.applyRemoteAwareness(remotePeer().publish({ id: 'peer2' }));
    expect(Array.from(collaboratorsOf(harness).keys()).sort()).toEqual(['peer1', 'peer2']);

    // peer2 left: the participant list changed, the awareness state did not.
    storeState.current = participantsState([{ userId: 'peer1' }]);
    harness.manager.refreshCollaborators();

    expect(Array.from(collaboratorsOf(harness).keys())).toEqual(['peer1']);
  });

  it('only renders users who may draw on a locked whiteboard', () => {
    const harness = setup([
      { userId: 'presenter', presenter: true },
      { userId: 'viewer', locked: true },
      { userId: 'writer' },
    ]);
    harness.manager.ensurePresence();
    harness.manager.applyRemoteAwareness(remotePeer().publish({ id: 'presenter' }));
    harness.manager.applyRemoteAwareness(remotePeer().publish({ id: 'viewer' }));
    harness.manager.applyRemoteAwareness(remotePeer().publish({ id: 'writer' }));

    expect(Array.from(collaboratorsOf(harness).keys()).sort()).toEqual(['presenter', 'writer']);
  });

  it('broadcasts a null state when the local presence is cleared', () => {
    const harness = setup([]);
    harness.manager.ensurePresence();
    const clientId = harness.awareness()!.clientID;
    const viewer = new Awareness(newDoc());
    harness.manager.setLocalPresence({ id: 'me' });
    applyAwarenessUpdate(viewer, harness.sentUpdate(0), 'remote');
    expect(viewer.getStates().get(clientId)).toMatchObject({ id: 'me' });

    harness.manager.clearLocalPresence();
    applyAwarenessUpdate(viewer, harness.sentUpdate(1), 'remote');

    expect(harness.send).toHaveBeenCalledTimes(2);
    expect(viewer.getStates().has(clientId)).toBe(false);
  });

  it('clears listeners and timers on teardown', () => {
    const harness = setup([{ userId: 'peer1' }]);
    harness.manager.ensurePresence();
    expect(vi.getTimerCount()).toBe(1);

    harness.manager.destroyPresence();

    expect(vi.getTimerCount()).toBe(0);
    expect(harness.awareness()).toBeNull();
    harness.send.mockClear();
    harness.updateScene.mockClear();

    harness.manager.setLocalPresence({ id: 'me' });
    harness.manager.clearLocalPresence();

    expect(harness.send).not.toHaveBeenCalled();
    expect(harness.updateScene).not.toHaveBeenCalled();
  });

  it('works again after teardown', () => {
    const harness = setup([]);
    harness.manager.ensurePresence();
    harness.manager.destroyPresence();

    harness.manager.ensurePresence();
    harness.manager.setLocalPresence({ id: 'me' });

    expect(harness.send).toHaveBeenCalledTimes(1);
  });

  it('ignores remote awareness before presence exists', () => {
    const harness = setup([{ userId: 'peer1' }]);
    const update = remotePeer().publish({ id: 'peer1' });

    expect(() => harness.manager.applyRemoteAwareness(update)).not.toThrow();
    expect(harness.send).not.toHaveBeenCalled();
    expect(harness.updateScene).not.toHaveBeenCalled();
  });

  it('survives a malformed remote payload', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const harness = setup([{ userId: 'peer1' }]);
    harness.manager.ensurePresence();

    // One client (id 5, clock 0) whose state string is not JSON.
    const broken = new Uint8Array([1, 5, 0, 1, 'x'.charCodeAt(0)]);

    expect(() => harness.manager.applyRemoteAwareness(broken)).not.toThrow();
    expect(error).toHaveBeenCalled();
    expect(harness.send).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
