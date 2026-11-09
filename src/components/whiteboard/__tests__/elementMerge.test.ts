import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

/* The controller pulls in the store, NATS and IndexedDB; merging needs none of them. */
vi.mock('../../../store', () => ({ store: { getState: () => ({}), dispatch: vi.fn() } }));
vi.mock('../../../helpers/nats', () => ({ getNatsConn: () => undefined }));
vi.mock('../../../helpers/utils', () => ({
  uint8ToBase64: (value: Uint8Array) => Buffer.from(value).toString('base64'),
  base64ToUint8: (value: string) => new Uint8Array(Buffer.from(value, 'base64')),
  isUserRecorder: (userId: string) => userId.startsWith('recorder'),
}));
vi.mock('../../../helpers/libs/idb', () => ({
  DB_STORE_NAMES: { WHITEBOARD: 'whiteboard' },
  idbStore: vi.fn(),
  idbGet: vi.fn(),
  idbGetAllKeys: vi.fn(),
  idbDel: vi.fn(),
}));

import { WhiteboardController } from '../collab/controller/WhiteboardController';
import { WHITEBOARD_ELEMENTS_MAP } from '../collab/utils';

/*
 * `mergeElements` is the local write path into a page CRDT: version-aware and
 * tombstone-only. Only the doc/elementsMap pair is injected, so no transport,
 * store or timers are involved.
 */

type PageFields = { doc: Y.Doc; elementsMap: Y.Map<string> };

const makePage = () => {
  const doc = new Y.Doc();
  const elementsMap = doc.getMap<string>(WHITEBOARD_ELEMENTS_MAP);
  const controller = new WhiteboardController();
  Object.assign(controller as unknown as PageFields, { doc, elementsMap });
  const updates: Uint8Array[] = [];
  doc.on('update', (update: Uint8Array) => updates.push(update));
  const stored = (id: string) => JSON.parse(elementsMap.get(id) ?? 'null');
  return { controller, elementsMap, updates, stored };
};

const el = (
  id: string,
  version = 1,
  versionNonce = 100,
  extra: Record<string, unknown> = {},
): ExcalidrawElement =>
  ({ id, version, versionNonce, isDeleted: false, ...extra }) as unknown as ExcalidrawElement;

describe('mergeElements', () => {
  it('adds new elements, keeping the given order', () => {
    const page = makePage();

    page.controller.mergeElements([el('b'), el('a'), el('c')]);

    expect(Array.from(page.elementsMap.keys())).toEqual(['b', 'a', 'c']);
  });

  it('keeps stored elements the incoming batch does not mention', () => {
    const page = makePage();

    page.controller.mergeElements([el('a')]);
    page.controller.mergeElements([el('b')]);

    expect(Array.from(page.elementsMap.keys())).toEqual(['a', 'b']);
  });

  it('replaces a stored element when the incoming version is higher', () => {
    const page = makePage();

    page.controller.mergeElements([el('el1', 1, 100, { strokeColor: '#000' })]);
    page.controller.mergeElements([el('el1', 2, 100, { strokeColor: '#f00' })]);

    expect(page.stored('el1')).toMatchObject({ version: 2, strokeColor: '#f00' });
  });

  it('ignores an incoming element with a lower version', () => {
    const page = makePage();

    page.controller.mergeElements([el('el1', 3, 100, { strokeColor: '#000' })]);
    page.controller.mergeElements([el('el1', 2, 1, { strokeColor: '#f00' })]);

    expect(page.stored('el1')).toMatchObject({ version: 3, strokeColor: '#000' });
    expect(page.updates).toHaveLength(1);
  });

  it('tie-breaks an equal version by the lower versionNonce', () => {
    const page = makePage();

    page.controller.mergeElements([el('el1', 2, 500)]);
    page.controller.mergeElements([el('el1', 2, 900)]);
    expect(page.stored('el1').versionNonce).toBe(500);

    page.controller.mergeElements([el('el1', 2, 100)]);
    expect(page.stored('el1').versionNonce).toBe(100);
  });

  it('lets a locally edited element win regardless of its version', () => {
    const page = makePage();
    page.controller.mergeElements([el('el1', 5, 1, { strokeColor: '#000' })]);

    const isEditingElement = vi.fn((id: string) => id === 'el1');
    page.controller.mergeElements([el('el1', 1, 1, { strokeColor: '#f00' })], isEditingElement);

    expect(isEditingElement).toHaveBeenCalledWith('el1');
    expect(page.stored('el1')).toMatchObject({ version: 1, strokeColor: '#f00' });
  });

  it('keeps deleted elements as tombstones instead of dropping the key', () => {
    const page = makePage();

    page.controller.mergeElements([el('el1', 1)]);
    page.controller.mergeElements([el('el1', 2, 1, { isDeleted: true })]);

    expect(page.elementsMap.has('el1')).toBe(true);
    expect(page.stored('el1').isDeleted).toBe(true);
    // A tombstone keeps what a peer received earlier, so it still counts as a change.
    expect(page.updates).toHaveLength(2);
  });

  it('writes a batch in one CRDT update and writes nothing for unchanged elements', () => {
    const page = makePage();

    page.controller.mergeElements([el('a'), el('b')]);
    expect(page.updates).toHaveLength(1);

    page.controller.mergeElements([el('a'), el('b')]);
    expect(page.updates).toHaveLength(1);
  });

  it('writes nothing for an empty batch', () => {
    const page = makePage();

    page.controller.mergeElements([]);

    expect(page.updates).toHaveLength(0);
    expect(page.elementsMap.size).toBe(0);
  });

  it('keeps existing keys in place when an element is updated', () => {
    const page = makePage();

    page.controller.mergeElements([el('a'), el('b')]);
    page.controller.mergeElements([el('a', 2)]);

    expect(Array.from(page.elementsMap.keys())).toEqual(['a', 'b']);
  });

  it('replaces a stored value that is not valid JSON', () => {
    const page = makePage();
    page.elementsMap.set('el1', 'not-json');

    page.controller.mergeElements([el('el1', 1)]);

    expect(page.stored('el1')).toMatchObject({ id: 'el1', version: 1 });
  });

  it('does not mutate the given elements', () => {
    const page = makePage();
    const incoming = [el('el1', 2, 1), el('el2', 3, 2)];
    const snapshot = structuredClone(incoming);

    page.controller.mergeElements(incoming);

    expect(incoming).toEqual(snapshot);
    expect(page.stored('el1')).toEqual(snapshot[0]);
    expect(page.stored('el2')).toEqual(snapshot[1]);
  });

  it('is a no-op without an active page doc', () => {
    const controller = new WhiteboardController();

    expect(() => controller.mergeElements([el('el1')])).not.toThrow();
  });
});
