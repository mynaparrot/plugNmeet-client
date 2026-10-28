import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState } from '@excalidraw/excalidraw/types';

import { createActiveToolPersistence } from '../helpers/hooks/useWhiteboardActiveToolPersistence';

const STORAGE_KEY = 'pnm-whiteboard-active-tool';

const tool = (type: string) => ({ type }) as unknown as AppState['activeTool'];

interface StorageOverrides {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

const setup = (stored?: StorageOverrides) => {
  const store = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    ...stored,
  };
  vi.stubGlobal('sessionStorage', storage);

  const setActiveTool = vi.fn();
  const persistence = createActiveToolPersistence({ setActiveTool });

  return { storage, setActiveTool, persistence };
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
    const { storage, persistence } = setup();

    persistence.onToolChange(tool(type));
    persistence.persist();

    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, type);
  });

  it('persists only the latest curated pick', () => {
    const { storage, persistence } = setup();

    persistence.onToolChange(tool('freedraw'));
    persistence.onToolChange(tool('text'));
    persistence.onToolChange(tool('text'));
    persistence.persist();

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'text');
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
    const { storage, persistence } = setup();

    persistence.onToolChange(tool(type));
    persistence.persist();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('does not write when no curated tool was used', () => {
    const { storage, persistence } = setup();

    persistence.persist();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('restores a stored curated tool exactly once', () => {
    const { storage, setActiveTool, persistence } = setup({
      getItem: vi.fn(() => 'laser'),
    });

    persistence.tryRestore();

    expect(setActiveTool).toHaveBeenCalledTimes(1);
    expect(setActiveTool).toHaveBeenCalledWith({ type: 'laser' });
    expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);

    persistence.tryRestore();

    expect(setActiveTool).toHaveBeenCalledTimes(1);
    expect(storage.removeItem).toHaveBeenCalledTimes(1);
  });

  it.each(['selection', 'image', 'eraser', 'not-a-tool', ''])(
    'skips restoring the non-restorable stored value %s',
    (value) => {
      const { storage, setActiveTool, persistence } = setup({
        getItem: vi.fn(() => value),
      });

      persistence.tryRestore();

      expect(setActiveTool).not.toHaveBeenCalled();
      expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    },
  );

  it('skips restoring when nothing is stored', () => {
    const { setActiveTool, persistence } = setup();

    persistence.tryRestore();

    expect(setActiveTool).not.toHaveBeenCalled();
  });

  it('ignores a throwing getItem', () => {
    const { setActiveTool, persistence } = setup({
      getItem: vi.fn(() => {
        throw new Error('storage disabled');
      }),
    });

    expect(() => persistence.tryRestore()).not.toThrow();
    expect(setActiveTool).not.toHaveBeenCalled();
  });

  it('ignores a throwing setItem', () => {
    const { persistence } = setup({
      setItem: vi.fn(() => {
        throw new Error('quota exceeded');
      }),
    });

    persistence.onToolChange(tool('freedraw'));

    expect(() => persistence.persist()).not.toThrow();
  });

  it('ignores a throwing removeItem', () => {
    const { setActiveTool, persistence } = setup({
      getItem: vi.fn(() => 'laser'),
      removeItem: vi.fn(() => {
        throw new Error('storage disabled');
      }),
    });

    expect(() => persistence.tryRestore()).not.toThrow();
    expect(setActiveTool).toHaveBeenCalledWith({ type: 'laser' });
  });
});
