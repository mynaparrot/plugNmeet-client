import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import type {
  AppState,
  ExcalidrawImperativeAPI,
  NormalizedZoomValue,
  ToolType,
} from '@excalidraw/excalidraw/types';

import { DB_STORE_NAMES, idbDel, idbGet, idbStore } from '../../../../helpers/libs/idb';

const ACTIVE_TOOL_STORAGE_KEY = 'active-tool';
const VIEWPORT_STORAGE_PREFIX = 'viewport';

// Drawing/text tools are worth remembering; niche and transient tools are not.
// "image" is excluded: restoring it would reopen the OS file dialog.
// oxfmt-ignore
const RESTORABLE_TOOLS = new Set<string>(['freedraw', 'laser', 'arrow', 'line', 'text', 'hand', 'rectangle', 'diamond', 'ellipse', 'stickynote']);

/**
 * The unmount write of one instance can still be landing while a remount reads
 * the tool back, so restores wait for it (read-after-write on the same database).
 */
let activeToolPendingWrite: Promise<void> | null = null;

export const createActiveToolPersistence = (
  api: Pick<ExcalidrawImperativeAPI, 'setActiveTool'>,
) => {
  let lastTool: string | null = null;
  let restored = false;

  return {
    onToolChange(tool: AppState['activeTool']) {
      if (RESTORABLE_TOOLS.has(tool.type)) {
        lastTool = tool.type;
      } else {
        lastTool = null;
      }
    },
    async tryRestore(): Promise<void> {
      if (restored) {
        return;
      }
      restored = true;

      let stored: string | undefined;
      try {
        await activeToolPendingWrite;
        stored = await idbGet<string>(DB_STORE_NAMES.WHITEBOARD, ACTIVE_TOOL_STORAGE_KEY);
      } catch {
        // storage unavailable
        return;
      }

      if (typeof stored === 'string' && RESTORABLE_TOOLS.has(stored)) {
        api.setActiveTool({ type: stored as ToolType });
      }
      // drop the stored value immediately: never restore a stale tool later
      try {
        await idbDel(DB_STORE_NAMES.WHITEBOARD, ACTIVE_TOOL_STORAGE_KEY);
      } catch {
        // storage unavailable
      }
    },
    async persist(): Promise<void> {
      if (!lastTool) {
        return;
      }
      const tool = lastTool;
      const write = (async () => {
        try {
          await idbStore(DB_STORE_NAMES.WHITEBOARD, ACTIVE_TOOL_STORAGE_KEY, tool);
        } catch {
          // storage unavailable
        }
      })();
      activeToolPendingWrite = write;
      await write;
    },
  };
};

/** Persisted viewport of one document scope. */
export interface ViewportSnapshot {
  scrollX: number;
  scrollY: number;
  zoom: number;
  /** Canvas width the viewport was recorded on; a different width invalidates it. */
  width?: number;
}

interface ScopedViewport extends ViewportSnapshot {
  fileId: string;
  page: number;
}

const viewportKey = (fileId: string, page: number) =>
  `${VIEWPORT_STORAGE_PREFIX}:${fileId}:${page}`;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPositiveLength = (value: unknown): value is number => isFiniteNumber(value) && value > 0;

/** Persisted shape; width is omitted when unknown so width-less entries stay unchanged. */
const toSnapshot = (
  scrollX: number,
  scrollY: number,
  zoom: number,
  width?: number,
): ViewportSnapshot =>
  width === undefined ? { scrollX, scrollY, zoom } : { scrollX, scrollY, zoom, width };

const parseViewport = (raw: unknown): ViewportSnapshot | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const { scrollX, scrollY, zoom, width } = raw as Partial<ViewportSnapshot>;
  if (!isFiniteNumber(scrollX) || !isFiniteNumber(scrollY) || !isFiniteNumber(zoom) || zoom <= 0) {
    return null;
  }
  if (width !== undefined && !isPositiveLength(width)) {
    return null;
  }
  return toSnapshot(scrollX, scrollY, zoom, width);
};

/** A zoom recorded on a canvas this much wider/narrower no longer fits. */
const WIDTH_MISMATCH_TOLERANCE = 1;

type ViewportPersistenceAPI = Pick<ExcalidrawImperativeAPI, 'updateScene'> &
  Partial<Pick<ExcalidrawImperativeAPI, 'getAppState'>>;

export const createViewportPersistence = (api: ViewportPersistenceAPI) => {
  let lastViewport: ScopedViewport | null = null;
  // The write of the page being left can still be in flight when the next page
  // restores, and IndexedDB reads are async: restores wait for it.
  let pendingWrite: Promise<void> | null = null;

  const canvasWidth = (): number | undefined => {
    const width = api.getAppState?.().width;
    return isPositiveLength(width) ? width : undefined;
  };

  return {
    onViewportChange(
      fileId: string,
      page: number,
      scrollX: number,
      scrollY: number,
      zoom: number,
      width?: number,
    ) {
      if (
        !fileId ||
        !isFiniteNumber(page) ||
        !isFiniteNumber(scrollX) ||
        !isFiniteNumber(scrollY) ||
        !isFiniteNumber(zoom) ||
        zoom <= 0
      ) {
        return;
      }
      lastViewport = {
        fileId,
        page,
        ...toSnapshot(scrollX, scrollY, zoom, isPositiveLength(width) ? width : canvasWidth()),
      };
    },
    async persistViewport(): Promise<void> {
      // Capture and consume the scope synchronously: a following page switch must
      // never re-persist this viewport under the key of the new page.
      const snapshot = lastViewport;
      lastViewport = null;
      if (!snapshot) {
        return;
      }
      const { fileId, page, scrollX, scrollY, zoom, width } = snapshot;
      const write = (async () => {
        try {
          await idbStore(
            DB_STORE_NAMES.WHITEBOARD,
            viewportKey(fileId, page),
            toSnapshot(scrollX, scrollY, zoom, width),
          );
        } catch {
          // storage unavailable
        }
      })();
      pendingWrite = write;
      await write;
    },
    async tryRestoreViewport(fileId: string, page: number): Promise<boolean> {
      const key = viewportKey(fileId, page);
      try {
        await pendingWrite;
      } catch {
        // a failed write must never block the restore
      }

      let raw: unknown;
      try {
        raw = await idbGet<unknown>(DB_STORE_NAMES.WHITEBOARD, key);
      } catch {
        // storage unavailable
      }
      // drop the stored value immediately: never restore a stale viewport later
      try {
        await idbDel(DB_STORE_NAMES.WHITEBOARD, key);
      } catch {
        // storage unavailable
      }

      const viewport = parseViewport(raw);
      if (!viewport) {
        // nothing stored for this scope: forget the previous scope so it is
        // never re-persisted under the wrong key after switching pages
        lastViewport = null;
        return false;
      }
      const currentWidth = canvasWidth();
      if (
        viewport.width !== undefined &&
        currentWidth !== undefined &&
        Math.abs(viewport.width - currentWidth) > WIDTH_MISMATCH_TOLERANCE
      ) {
        // Recorded on a differently sized canvas: its zoom no longer fits, so the
        // caller recomputes it for the current width instead of restoring it.
        lastViewport = null;
        return false;
      }
      // keep the restored position in memory so leaving/unmounting re-persists it
      lastViewport = { fileId, page, ...viewport };
      api.updateScene({
        appState: {
          scrollX: viewport.scrollX,
          scrollY: viewport.scrollY,
          zoom: { value: viewport.zoom as NormalizedZoomValue },
        },
      });
      return true;
    },
  };
};

interface IUseWhiteboardSessionPersistence {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  viewModeEnabled: boolean;
  currentFileId: string;
  currentPage: number;
  isSwitching: RefObject<boolean>;
}

const useWhiteboardSessionPersistence = ({
  excalidrawAPI,
  viewModeEnabled,
  currentFileId,
  currentPage,
  isSwitching,
}: IUseWhiteboardSessionPersistence) => {
  const toolPersistence = useMemo(
    () => (excalidrawAPI ? createActiveToolPersistence(excalidrawAPI) : null),
    [excalidrawAPI],
  );
  const viewportPersistence = useMemo(
    () => (excalidrawAPI ? createViewportPersistence(excalidrawAPI) : null),
    [excalidrawAPI],
  );

  const scopeRef = useRef({ fileId: currentFileId, page: currentPage });
  // Scrolls before the first restore are bootstrap noise, not user intent.
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!excalidrawAPI || !toolPersistence || viewModeEnabled) {
      return;
    }
    const unsubscribe = excalidrawAPI.onStateChange('activeTool', toolPersistence.onToolChange);
    void toolPersistence.tryRestore();
    return unsubscribe;
  }, [excalidrawAPI, toolPersistence, viewModeEnabled]);

  useEffect(() => {
    if (!excalidrawAPI || !viewportPersistence) {
      return;
    }
    return excalidrawAPI.onScrollChange((scrollX, scrollY, zoom) => {
      if (isSwitching.current || !bootstrappedRef.current) {
        return;
      }
      const { fileId, page } = scopeRef.current;
      viewportPersistence.onViewportChange(fileId, page, scrollX, scrollY, zoom.value);
    });
  }, [excalidrawAPI, viewportPersistence, isSwitching]);

  // Persist the page being left: the recorded viewport already belongs to it.
  useEffect(() => {
    const scope = scopeRef.current;
    if (scope.fileId === currentFileId && scope.page === currentPage) {
      return;
    }
    void viewportPersistence?.persistViewport();
    scopeRef.current = { fileId: currentFileId, page: currentPage };
  }, [currentFileId, currentPage, viewportPersistence]);

  // persist on unmount only: the imperative API is unsafe during teardown.
  useEffect(() => {
    return () => {
      void toolPersistence?.persist();
      void viewportPersistence?.persistViewport();
    };
  }, [toolPersistence, viewportPersistence]);

  /** Restores the stored viewport of `fileId:page`; true when it was applied. */
  const tryRestoreViewport = useCallback(
    async (fileId: string, page: number): Promise<boolean> => {
      bootstrappedRef.current = true;
      return (await viewportPersistence?.tryRestoreViewport(fileId, page)) ?? false;
    },
    [viewportPersistence],
  );

  return { tryRestoreViewport };
};

export default useWhiteboardSessionPersistence;
