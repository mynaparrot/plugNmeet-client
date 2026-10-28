import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState } from '@excalidraw/excalidraw/types';

import {
  createActiveToolPersistence,
  createViewportPersistence,
} from '../helpers/hooks/useWhiteboardSessionPersistence';

/*
 * Session persistence runs on the room+user scoped IndexedDB (`IDBManager`), so
 * only the idb module is faked: the in-memory map below behaves like one store.
 */
const { fakeIdb, idbStore, idbGet, idbDel } = vi.hoisted(() => {
  const entries = new Map<string, unknown>();
  const id = (storeName: string, key: string) => `${storeName}::${key}`;
  const fakeIdb = {
    put(storeName: string, key: string, value: unknown) {
      entries.set(id(storeName, key), structuredClone(value));
    },
    read(storeName: string, key: string) {
      return entries.get(id(storeName, key));
    },
    has(storeName: string, key: string) {
      return entries.has(id(storeName, key));
    },
    clear() {
      entries.clear();
    },
  };
  return {
    fakeIdb,
    idbStore: vi.fn(async (storeName: string, key: string, value: unknown) => {
      fakeIdb.put(storeName, key, value);
    }),
    idbGet: vi.fn(async (storeName: string, key: string) => fakeIdb.read(storeName, key)),
    idbDel: vi.fn(async (storeName: string, key: string) => {
      entries.delete(id(storeName, key));
    }),
  };
});

vi.mock('../../../helpers/libs/idb', () => ({
  DB_STORE_NAMES: { WHITEBOARD: 'whiteboard' },
  idbStore,
  idbGet,
  idbDel,
}));

const STORE = 'whiteboard';
const TOOL_STORAGE_KEY = 'pnm-whiteboard-active-tool';
const viewportKey = (fileId: string, page: number) => `pnm-whiteboard-viewport:${fileId}:${page}`;

const tool = (type: string) => ({ type }) as unknown as AppState['activeTool'];

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const setupTool = () => {
  const setActiveTool = vi.fn();
  const persistence = createActiveToolPersistence({ setActiveTool });
  return { setActiveTool, persistence };
};

const setupViewport = () => {
  const updateScene = vi.fn();
  const persistence = createViewportPersistence({ updateScene });
  return { updateScene, persistence };
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeIdb.clear();
});

describe('active tool persistence', () => {
  it.each([
    'freedraw',
    'laser',
    'arrow',
    'line',
    'text',
    'hand',
    'rectangle',
    'diamond',
    'ellipse',
    'stickynote',
  ])('persists the curated tool %s', async (type) => {
    const { persistence } = setupTool();

    persistence.onToolChange(tool(type));
    await persistence.persist();

    expect(idbStore).toHaveBeenCalledTimes(1);
    expect(idbStore).toHaveBeenCalledWith(STORE, TOOL_STORAGE_KEY, type);
    expect(fakeIdb.read(STORE, TOOL_STORAGE_KEY)).toBe(type);
  });

  it('persists only the latest curated pick', async () => {
    const { persistence } = setupTool();

    persistence.onToolChange(tool('freedraw'));
    persistence.onToolChange(tool('text'));
    persistence.onToolChange(tool('text'));
    await persistence.persist();

    expect(idbStore).toHaveBeenCalledTimes(1);
    expect(idbStore).toHaveBeenCalledWith(STORE, TOOL_STORAGE_KEY, 'text');
  });

  it.each([
    'selection',
    'image',
    'eraser',
    'lasso',
    'frame',
    'magicframe',
    'embeddable',
    'autoshape',
    'bucketfill',
    'custom',
  ])('ignores the non-restorable tool %s', async (type) => {
    const { persistence } = setupTool();

    persistence.onToolChange(tool(type));
    await persistence.persist();

    expect(idbStore).not.toHaveBeenCalled();
  });

  it('does not write when no curated tool was used', async () => {
    const { persistence } = setupTool();

    await persistence.persist();

    expect(idbStore).not.toHaveBeenCalled();
  });

  it('restores a stored curated tool exactly once', async () => {
    fakeIdb.put(STORE, TOOL_STORAGE_KEY, 'laser');
    const { setActiveTool, persistence } = setupTool();

    await persistence.tryRestore();

    expect(setActiveTool).toHaveBeenCalledTimes(1);
    expect(setActiveTool).toHaveBeenCalledWith({ type: 'laser' });
    expect(idbDel).toHaveBeenCalledWith(STORE, TOOL_STORAGE_KEY);
    expect(fakeIdb.has(STORE, TOOL_STORAGE_KEY)).toBe(false);

    await persistence.tryRestore();

    expect(setActiveTool).toHaveBeenCalledTimes(1);
    expect(idbDel).toHaveBeenCalledTimes(1);
  });

  it.each(['selection', 'image', 'eraser', 'not-a-tool', ''])(
    'skips restoring the non-restorable stored value %s',
    async (value) => {
      fakeIdb.put(STORE, TOOL_STORAGE_KEY, value);
      const { setActiveTool, persistence } = setupTool();

      await persistence.tryRestore();

      expect(setActiveTool).not.toHaveBeenCalled();
      expect(idbDel).toHaveBeenCalledWith(STORE, TOOL_STORAGE_KEY);
      expect(fakeIdb.has(STORE, TOOL_STORAGE_KEY)).toBe(false);
    },
  );

  it('skips restoring when nothing is stored', async () => {
    const { setActiveTool, persistence } = setupTool();

    await persistence.tryRestore();

    expect(idbGet).toHaveBeenCalledWith(STORE, TOOL_STORAGE_KEY);
    expect(setActiveTool).not.toHaveBeenCalled();
    expect(idbDel).toHaveBeenCalledWith(STORE, TOOL_STORAGE_KEY);
  });

  it('restores only once even when called concurrently', async () => {
    fakeIdb.put(STORE, TOOL_STORAGE_KEY, 'hand');
    const { setActiveTool, persistence } = setupTool();

    await Promise.all([persistence.tryRestore(), persistence.tryRestore()]);

    expect(setActiveTool).toHaveBeenCalledTimes(1);
  });

  it('ignores a rejecting read', async () => {
    vi.mocked(idbGet).mockRejectedValueOnce(new Error('db unavailable'));
    const { setActiveTool, persistence } = setupTool();

    await expect(persistence.tryRestore()).resolves.toBeUndefined();
    expect(setActiveTool).not.toHaveBeenCalled();
  });

  it('ignores a rejecting write', async () => {
    vi.mocked(idbStore).mockRejectedValueOnce(new Error('quota exceeded'));
    const { persistence } = setupTool();

    persistence.onToolChange(tool('freedraw'));

    await expect(persistence.persist()).resolves.toBeUndefined();
  });

  it('ignores a rejecting delete', async () => {
    fakeIdb.put(STORE, TOOL_STORAGE_KEY, 'laser');
    vi.mocked(idbDel).mockRejectedValueOnce(new Error('db unavailable'));
    const { setActiveTool, persistence } = setupTool();

    await expect(persistence.tryRestore()).resolves.toBeUndefined();
    expect(setActiveTool).toHaveBeenCalledWith({ type: 'laser' });
  });

  it('waits for the in-flight write of the previous mount before restoring', async () => {
    const gate = deferred();
    vi.mocked(idbStore).mockImplementationOnce(async (storeName, key, value) => {
      await gate.promise;
      fakeIdb.put(storeName, key, value);
    });

    const unmounting = setupTool();
    unmounting.persistence.onToolChange(tool('text'));
    const writing = unmounting.persistence.persist();

    // Remount: the read must not win the race against that write.
    const { setActiveTool, persistence } = setupTool();
    const restoring = persistence.tryRestore();
    gate.resolve();
    await Promise.all([writing, restoring]);

    expect(setActiveTool).toHaveBeenCalledWith({ type: 'text' });
  });
});

describe('viewport persistence', () => {
  it('persists the last viewport under its fileId:page key', async () => {
    const { persistence } = setupViewport();

    persistence.onViewportChange('default', 1, -120, -80, 0.75);
    await persistence.persistViewport();

    expect(idbStore).toHaveBeenCalledTimes(1);
    expect(idbStore).toHaveBeenCalledWith(STORE, viewportKey('default', 1), {
      scrollX: -120,
      scrollY: -80,
      zoom: 0.75,
    });
    expect(fakeIdb.read(STORE, viewportKey('default', 1))).toEqual({
      scrollX: -120,
      scrollY: -80,
      zoom: 0.75,
    });
  });

  it('persists only the latest recorded viewport', async () => {
    const { persistence } = setupViewport();

    persistence.onViewportChange('default', 1, 0, 0, 1);
    persistence.onViewportChange('default', 1, 10, 20, 0.5);
    await persistence.persistViewport();

    expect(idbStore).toHaveBeenCalledTimes(1);
    expect(idbStore).toHaveBeenCalledWith(STORE, viewportKey('default', 1), {
      scrollX: 10,
      scrollY: 20,
      zoom: 0.5,
    });
  });

  it('does not write when no viewport was recorded', async () => {
    const { persistence } = setupViewport();

    await persistence.persistViewport();

    expect(idbStore).not.toHaveBeenCalled();
  });

  it.each([
    ['empty fileId', '', 1, 0, 0, 1],
    ['non-finite page', 'default', Number.NaN, 0, 0, 1],
    ['non-finite scrollX', 'default', 1, Number.NaN, 0, 1],
    ['infinite scrollY', 'default', 1, 0, Number.POSITIVE_INFINITY, 1],
    ['non-finite zoom', 'default', 1, 0, 0, Number.NaN],
    ['zero zoom', 'default', 1, 0, 0, 0],
    ['negative zoom', 'default', 1, 0, 0, -1],
  ])('ignores an invalid %s', async (_label, fileId, page, scrollX, scrollY, zoom) => {
    const { persistence } = setupViewport();

    persistence.onViewportChange(fileId, page, scrollX, scrollY, zoom);
    await persistence.persistViewport();

    expect(idbStore).not.toHaveBeenCalled();
  });

  it('restores a stored viewport and consumes the key', async () => {
    fakeIdb.put(STORE, viewportKey('default', 1), { scrollX: 42, scrollY: -7, zoom: 0.6 });
    const { updateScene, persistence } = setupViewport();

    await expect(persistence.tryRestoreViewport('default', 1)).resolves.toBe(true);

    expect(updateScene).toHaveBeenCalledTimes(1);
    expect(updateScene).toHaveBeenCalledWith({
      appState: { scrollX: 42, scrollY: -7, zoom: { value: 0.6 } },
    });
    expect(idbDel).toHaveBeenCalledWith(STORE, viewportKey('default', 1));
    expect(fakeIdb.has(STORE, viewportKey('default', 1))).toBe(false);
  });

  it('restores a page only once', async () => {
    fakeIdb.put(STORE, viewportKey('default', 1), { scrollX: 1, scrollY: 2, zoom: 1 });
    const { updateScene, persistence } = setupViewport();

    await persistence.tryRestoreViewport('default', 1);
    await expect(persistence.tryRestoreViewport('default', 1)).resolves.toBe(false);

    expect(updateScene).toHaveBeenCalledTimes(1);
  });

  it('returns false and leaves the scene alone when nothing is stored', async () => {
    const { updateScene, persistence } = setupViewport();

    await expect(persistence.tryRestoreViewport('default', 1)).resolves.toBe(false);
    expect(updateScene).not.toHaveBeenCalled();
  });

  it('re-persists a restored viewport when the page is left without scrolling', async () => {
    fakeIdb.put(STORE, viewportKey('default', 1), { scrollX: 5, scrollY: 6, zoom: 0.5 });
    const { persistence } = setupViewport();

    await persistence.tryRestoreViewport('default', 1);
    await persistence.persistViewport();

    expect(idbStore).toHaveBeenCalledWith(STORE, viewportKey('default', 1), {
      scrollX: 5,
      scrollY: 6,
      zoom: 0.5,
    });
  });

  it('forgets the previous page viewport when the new page has nothing stored', async () => {
    const { persistence } = setupViewport();

    // page 1 is scrolled, then persisted while switching to page 2
    persistence.onViewportChange('default', 1, 10, 20, 0.5);
    await persistence.persistViewport();
    const written = fakeIdb.read(STORE, viewportKey('default', 1));

    // page 2 has no stored viewport
    await expect(persistence.tryRestoreViewport('default', 2)).resolves.toBe(false);

    const writesBeforeLeave = vi.mocked(idbStore).mock.calls.length;

    // leaving page 2 without scrolling must not re-write page 1 under its own key
    await persistence.persistViewport();

    expect(vi.mocked(idbStore).mock.calls.length).toBe(writesBeforeLeave);
    expect(fakeIdb.read(STORE, viewportKey('default', 1))).toEqual(written);
    expect(fakeIdb.has(STORE, viewportKey('default', 2))).toBe(false);
  });

  it('never writes the page being left under the key of the page replacing it', async () => {
    const { persistence } = setupViewport();

    persistence.onViewportChange('default', 1, 10, 20, 0.5);
    await Promise.all([
      persistence.persistViewport(),
      persistence.tryRestoreViewport('default', 2),
      // unmount of the page-2 scope: nothing recorded for it
      persistence.persistViewport(),
    ]);

    expect(fakeIdb.has(STORE, viewportKey('default', 2))).toBe(false);
    expect(fakeIdb.read(STORE, viewportKey('default', 1))).toEqual({
      scrollX: 10,
      scrollY: 20,
      zoom: 0.5,
    });
  });

  it.each([
    ['missing fields', {}],
    ['non-finite values', { scrollX: '1', scrollY: 2, zoom: 1 }],
    ['zero zoom', { scrollX: 1, scrollY: 2, zoom: 0 }],
    ['negative zoom', { scrollX: 1, scrollY: 2, zoom: -2 }],
    ['null payload', null],
    ['string payload', '{"scrollX":1,"scrollY":2,"zoom":1}'],
    ['number payload', 42],
  ])('drops the corrupt stored value %s', async (_label, raw) => {
    fakeIdb.put(STORE, viewportKey('default', 1), raw);
    const { updateScene, persistence } = setupViewport();

    await expect(persistence.tryRestoreViewport('default', 1)).resolves.toBe(false);

    expect(updateScene).not.toHaveBeenCalled();
    expect(idbDel).toHaveBeenCalledWith(STORE, viewportKey('default', 1));
    expect(fakeIdb.has(STORE, viewportKey('default', 1))).toBe(false);
  });

  it('keeps the viewports of different pages independent', async () => {
    fakeIdb.put(STORE, viewportKey('default', 1), { scrollX: 1, scrollY: 1, zoom: 1 });
    fakeIdb.put(STORE, viewportKey('default', 2), { scrollX: 2, scrollY: 2, zoom: 0.5 });
    fakeIdb.put(STORE, viewportKey('file-abc', 3), { scrollX: 3, scrollY: 3, zoom: 0.25 });
    const { updateScene, persistence } = setupViewport();

    await expect(persistence.tryRestoreViewport('default', 2)).resolves.toBe(true);
    await expect(persistence.tryRestoreViewport('file-abc', 3)).resolves.toBe(true);
    expect(updateScene).toHaveBeenNthCalledWith(1, {
      appState: { scrollX: 2, scrollY: 2, zoom: { value: 0.5 } },
    });
    expect(updateScene).toHaveBeenNthCalledWith(2, {
      appState: { scrollX: 3, scrollY: 3, zoom: { value: 0.25 } },
    });
    expect(fakeIdb.has(STORE, viewportKey('default', 1))).toBe(true);

    // the last restored scope is the one re-persisted on the next switch
    await persistence.persistViewport();
    expect(fakeIdb.read(STORE, viewportKey('file-abc', 3))).toEqual({
      scrollX: 3,
      scrollY: 3,
      zoom: 0.25,
    });
  });

  it('waits for the in-flight write of the page before reading it back', async () => {
    const gate = deferred();
    vi.mocked(idbStore).mockImplementationOnce(async (storeName, key, value) => {
      await gate.promise;
      fakeIdb.put(storeName, key, value);
    });
    const { updateScene, persistence } = setupViewport();

    persistence.onViewportChange('default', 1, 10, 20, 0.5);
    const writing = persistence.persistViewport();
    // Page 1 is entered again right away while its write is still in flight.
    const restoring = persistence.tryRestoreViewport('default', 1);
    gate.resolve();
    await writing;

    await expect(restoring).resolves.toBe(true);
    expect(updateScene).toHaveBeenCalledWith({
      appState: { scrollX: 10, scrollY: 20, zoom: { value: 0.5 } },
    });
  });

  it('ignores a rejecting read', async () => {
    vi.mocked(idbGet).mockRejectedValueOnce(new Error('db unavailable'));
    const { updateScene, persistence } = setupViewport();

    await expect(persistence.tryRestoreViewport('default', 1)).resolves.toBe(false);
    expect(updateScene).not.toHaveBeenCalled();
  });

  it('ignores a rejecting delete', async () => {
    fakeIdb.put(STORE, viewportKey('default', 1), { scrollX: 1, scrollY: 2, zoom: 1 });
    vi.mocked(idbDel).mockRejectedValueOnce(new Error('db unavailable'));
    const { updateScene, persistence } = setupViewport();

    await expect(persistence.tryRestoreViewport('default', 1)).resolves.toBe(true);
    expect(updateScene).toHaveBeenCalledTimes(1);
  });

  it('ignores a rejecting write', async () => {
    vi.mocked(idbStore).mockRejectedValueOnce(new Error('quota exceeded'));
    const { persistence } = setupViewport();

    persistence.onViewportChange('default', 1, 1, 2, 1);

    await expect(persistence.persistViewport()).resolves.toBeUndefined();
  });
});
