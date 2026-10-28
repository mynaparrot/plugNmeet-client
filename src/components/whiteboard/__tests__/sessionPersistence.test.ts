import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState } from '@excalidraw/excalidraw/types';

import {
  createActiveToolPersistence,
  createViewportPersistence,
} from '../helpers/hooks/useWhiteboardSessionPersistence';

const TOOL_STORAGE_KEY = 'pnm-whiteboard-active-tool';
const viewportKey = (fileId: string, page: number) => `pnm-whiteboard-viewport:${fileId}:${page}`;

const tool = (type: string) => ({ type }) as unknown as AppState['activeTool'];

interface StorageOverrides {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

const stubSessionStorage = (overrides?: StorageOverrides) => {
  const store = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    ...overrides,
  };
  vi.stubGlobal('sessionStorage', storage);
  return { storage, store };
};

const setupTool = (overrides?: StorageOverrides) => {
  const { storage } = stubSessionStorage(overrides);
  const setActiveTool = vi.fn();
  const persistence = createActiveToolPersistence({ setActiveTool });

  return { storage, setActiveTool, persistence };
};

const setupViewport = (overrides?: StorageOverrides) => {
  const { storage, store } = stubSessionStorage(overrides);
  const updateScene = vi.fn();
  const persistence = createViewportPersistence({ updateScene });

  return { storage, store, updateScene, persistence };
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
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
  ])('persists the curated tool %s', (type) => {
    const { storage, persistence } = setupTool();

    persistence.onToolChange(tool(type));
    persistence.persist();

    expect(storage.setItem).toHaveBeenCalledWith(TOOL_STORAGE_KEY, type);
  });

  it('persists only the latest curated pick', () => {
    const { storage, persistence } = setupTool();

    persistence.onToolChange(tool('freedraw'));
    persistence.onToolChange(tool('text'));
    persistence.onToolChange(tool('text'));
    persistence.persist();

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(TOOL_STORAGE_KEY, 'text');
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
  ])('ignores the non-restorable tool %s', (type) => {
    const { storage, persistence } = setupTool();

    persistence.onToolChange(tool(type));
    persistence.persist();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('does not write when no curated tool was used', () => {
    const { storage, persistence } = setupTool();

    persistence.persist();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('restores a stored curated tool exactly once', () => {
    const { storage, setActiveTool, persistence } = setupTool({
      getItem: vi.fn(() => 'laser'),
    });

    persistence.tryRestore();

    expect(setActiveTool).toHaveBeenCalledTimes(1);
    expect(setActiveTool).toHaveBeenCalledWith({ type: 'laser' });
    expect(storage.removeItem).toHaveBeenCalledWith(TOOL_STORAGE_KEY);

    persistence.tryRestore();

    expect(setActiveTool).toHaveBeenCalledTimes(1);
    expect(storage.removeItem).toHaveBeenCalledTimes(1);
  });

  it.each(['selection', 'image', 'eraser', 'not-a-tool', ''])(
    'skips restoring the non-restorable stored value %s',
    (value) => {
      const { storage, setActiveTool, persistence } = setupTool({
        getItem: vi.fn(() => value),
      });

      persistence.tryRestore();

      expect(setActiveTool).not.toHaveBeenCalled();
      expect(storage.removeItem).toHaveBeenCalledWith(TOOL_STORAGE_KEY);
    },
  );

  it('skips restoring when nothing is stored', () => {
    const { setActiveTool, persistence } = setupTool();

    persistence.tryRestore();

    expect(setActiveTool).not.toHaveBeenCalled();
  });

  it('ignores a throwing getItem', () => {
    const { setActiveTool, persistence } = setupTool({
      getItem: vi.fn(() => {
        throw new Error('storage disabled');
      }),
    });

    expect(() => persistence.tryRestore()).not.toThrow();
    expect(setActiveTool).not.toHaveBeenCalled();
  });

  it('ignores a throwing setItem', () => {
    const { persistence } = setupTool({
      setItem: vi.fn(() => {
        throw new Error('quota exceeded');
      }),
    });

    persistence.onToolChange(tool('freedraw'));

    expect(() => persistence.persist()).not.toThrow();
  });

  it('ignores a throwing removeItem', () => {
    const { setActiveTool, persistence } = setupTool({
      getItem: vi.fn(() => 'laser'),
      removeItem: vi.fn(() => {
        throw new Error('storage disabled');
      }),
    });

    expect(() => persistence.tryRestore()).not.toThrow();
    expect(setActiveTool).toHaveBeenCalledWith({ type: 'laser' });
  });
});

describe('viewport persistence', () => {
  it('persists the last viewport under its fileId:page key', () => {
    const { storage, persistence } = setupViewport();

    persistence.onViewportChange('default', 1, -120, -80, 0.75);
    persistence.persistViewport();

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(
      viewportKey('default', 1),
      JSON.stringify({ scrollX: -120, scrollY: -80, zoom: 0.75 }),
    );
  });

  it('persists only the latest recorded viewport', () => {
    const { storage, persistence } = setupViewport();

    persistence.onViewportChange('default', 1, 0, 0, 1);
    persistence.onViewportChange('default', 1, 10, 20, 0.5);
    persistence.persistViewport();

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(
      viewportKey('default', 1),
      JSON.stringify({ scrollX: 10, scrollY: 20, zoom: 0.5 }),
    );
  });

  it('does not write when no viewport was recorded', () => {
    const { storage, persistence } = setupViewport();

    persistence.persistViewport();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each([
    ['empty fileId', '', 1, 0, 0, 1],
    ['non-finite page', 'default', Number.NaN, 0, 0, 1],
    ['non-finite scrollX', 'default', 1, Number.NaN, 0, 1],
    ['infinite scrollY', 'default', 1, 0, Number.POSITIVE_INFINITY, 1],
    ['non-finite zoom', 'default', 1, 0, 0, Number.NaN],
    ['zero zoom', 'default', 1, 0, 0, 0],
    ['negative zoom', 'default', 1, 0, 0, -1],
  ])('ignores an invalid %s', (_label, fileId, page, scrollX, scrollY, zoom) => {
    const { storage, persistence } = setupViewport();

    persistence.onViewportChange(fileId, page, scrollX, scrollY, zoom);
    persistence.persistViewport();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('restores a stored viewport and consumes the key', () => {
    const { storage, store, updateScene, persistence } = setupViewport();
    store.set(viewportKey('default', 1), JSON.stringify({ scrollX: 42, scrollY: -7, zoom: 0.6 }));

    expect(persistence.tryRestoreViewport('default', 1)).toBe(true);

    expect(updateScene).toHaveBeenCalledTimes(1);
    expect(updateScene).toHaveBeenCalledWith({
      appState: { scrollX: 42, scrollY: -7, zoom: { value: 0.6 } },
    });
    expect(storage.removeItem).toHaveBeenCalledWith(viewportKey('default', 1));
    expect(store.has(viewportKey('default', 1))).toBe(false);
  });

  it('restores a page only once', () => {
    const { store, updateScene, persistence } = setupViewport();
    store.set(viewportKey('default', 1), JSON.stringify({ scrollX: 1, scrollY: 2, zoom: 1 }));

    persistence.tryRestoreViewport('default', 1);
    expect(persistence.tryRestoreViewport('default', 1)).toBe(false);

    expect(updateScene).toHaveBeenCalledTimes(1);
  });

  it('returns false and leaves the scene alone when nothing is stored', () => {
    const { updateScene, persistence } = setupViewport();

    expect(persistence.tryRestoreViewport('default', 1)).toBe(false);
    expect(updateScene).not.toHaveBeenCalled();
  });

  it('re-persists a restored viewport when the page is left without scrolling', () => {
    const { storage, store, persistence } = setupViewport();
    store.set(viewportKey('default', 1), JSON.stringify({ scrollX: 5, scrollY: 6, zoom: 0.5 }));

    persistence.tryRestoreViewport('default', 1);
    persistence.persistViewport();

    expect(storage.setItem).toHaveBeenCalledWith(
      viewportKey('default', 1),
      JSON.stringify({ scrollX: 5, scrollY: 6, zoom: 0.5 }),
    );
  });

  it('forgets the previous page viewport when the new page has nothing stored', () => {
    const { storage, store, persistence } = setupViewport();

    // page 1 is scrolled, then persisted while switching to page 2
    persistence.onViewportChange('default', 1, 10, 20, 0.5);
    persistence.persistViewport();
    const written = store.get(viewportKey('default', 1));

    // page 2 has no stored viewport
    expect(persistence.tryRestoreViewport('default', 2)).toBe(false);

    const writesBeforeLeave = vi.mocked(storage.setItem).mock.calls.length;

    // leaving page 2 without scrolling must not re-write page 1 under its own key
    persistence.persistViewport();

    expect(vi.mocked(storage.setItem).mock.calls.length).toBe(writesBeforeLeave);
    expect(store.get(viewportKey('default', 1))).toBe(written);
    expect(store.has(viewportKey('default', 2))).toBe(false);
  });

  it.each([
    ['corrupt json', '{not json'],
    ['missing fields', JSON.stringify({ scrollX: 1 })],
    ['non-finite values', JSON.stringify({ scrollX: '1', scrollY: 2, zoom: 1 })],
    ['zero zoom', JSON.stringify({ scrollX: 1, scrollY: 2, zoom: 0 })],
    ['negative zoom', JSON.stringify({ scrollX: 1, scrollY: 2, zoom: -2 })],
    ['null payload', 'null'],
  ])('drops the corrupt stored value %s', (_label, raw) => {
    const { storage, store, updateScene, persistence } = setupViewport();
    store.set(viewportKey('default', 1), raw);

    expect(persistence.tryRestoreViewport('default', 1)).toBe(false);

    expect(updateScene).not.toHaveBeenCalled();
    expect(storage.removeItem).toHaveBeenCalledWith(viewportKey('default', 1));
    expect(store.has(viewportKey('default', 1))).toBe(false);
  });

  it('keeps the viewports of different pages independent', () => {
    const { store, updateScene, persistence } = setupViewport();
    store.set(viewportKey('default', 1), JSON.stringify({ scrollX: 1, scrollY: 1, zoom: 1 }));
    store.set(viewportKey('default', 2), JSON.stringify({ scrollX: 2, scrollY: 2, zoom: 0.5 }));
    store.set(viewportKey('file-abc', 3), JSON.stringify({ scrollX: 3, scrollY: 3, zoom: 0.25 }));

    expect(persistence.tryRestoreViewport('default', 2)).toBe(true);
    expect(persistence.tryRestoreViewport('file-abc', 3)).toBe(true);
    expect(updateScene).toHaveBeenNthCalledWith(1, {
      appState: { scrollX: 2, scrollY: 2, zoom: { value: 0.5 } },
    });
    expect(updateScene).toHaveBeenNthCalledWith(2, {
      appState: { scrollX: 3, scrollY: 3, zoom: { value: 0.25 } },
    });
    expect(store.has(viewportKey('default', 1))).toBe(true);

    // the last restored scope is the one re-persisted on the next switch
    persistence.persistViewport();
    expect(store.get(viewportKey('file-abc', 3))).toBe(
      JSON.stringify({ scrollX: 3, scrollY: 3, zoom: 0.25 }),
    );
  });

  it('ignores a throwing getItem', () => {
    const { updateScene, persistence } = setupViewport({
      getItem: vi.fn(() => {
        throw new Error('storage disabled');
      }),
    });

    expect(persistence.tryRestoreViewport('default', 1)).toBe(false);
    expect(updateScene).not.toHaveBeenCalled();
  });

  it('ignores a throwing removeItem', () => {
    const { updateScene, persistence } = setupViewport({
      getItem: vi.fn(() => JSON.stringify({ scrollX: 1, scrollY: 2, zoom: 1 })),
      removeItem: vi.fn(() => {
        throw new Error('storage disabled');
      }),
    });

    expect(persistence.tryRestoreViewport('default', 1)).toBe(true);
    expect(updateScene).toHaveBeenCalledTimes(1);
  });

  it('ignores a throwing setItem', () => {
    const { persistence } = setupViewport({
      setItem: vi.fn(() => {
        throw new Error('quota exceeded');
      }),
    });

    persistence.onViewportChange('default', 1, 1, 2, 1);

    expect(() => persistence.persistViewport()).not.toThrow();
  });
});
