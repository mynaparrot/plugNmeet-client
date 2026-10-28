import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import type {
  AppState,
  ExcalidrawImperativeAPI,
  NormalizedZoomValue,
  ToolType,
} from '@excalidraw/excalidraw/types';

const ACTIVE_TOOL_STORAGE_KEY = 'pnm-whiteboard-active-tool';
const VIEWPORT_STORAGE_PREFIX = 'pnm-whiteboard-viewport';

// Drawing/text tools are worth remembering; niche and transient tools are not.
// "image" is excluded: restoring it would reopen the OS file dialog.
// oxfmt-ignore
const RESTORABLE_TOOLS = new Set<string>(['freedraw', 'laser', 'arrow', 'line', 'text', 'hand', 'rectangle', 'diamond', 'ellipse', 'stickynote']);

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
    tryRestore() {
      if (restored) {
        return;
      }
      restored = true;
      try {
        const stored = sessionStorage.getItem(ACTIVE_TOOL_STORAGE_KEY);
        if (stored && RESTORABLE_TOOLS.has(stored)) {
          api.setActiveTool({ type: stored as ToolType });
        }
        // drop the stored value immediately: never restore a stale tool later
        sessionStorage.removeItem(ACTIVE_TOOL_STORAGE_KEY);
      } catch {
        // storage unavailable
      }
    },
    persist() {
      if (!lastTool) {
        return;
      }
      try {
        sessionStorage.setItem(ACTIVE_TOOL_STORAGE_KEY, lastTool);
      } catch {
        // storage unavailable
      }
    },
  };
};

/** Persisted viewport of one document scope. */
export interface ViewportSnapshot {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

interface ScopedViewport extends ViewportSnapshot {
  fileId: string;
  page: number;
}

const viewportKey = (fileId: string, page: number) =>
  `${VIEWPORT_STORAGE_PREFIX}:${fileId}:${page}`;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const parseViewport = (raw: string): ViewportSnapshot | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const { scrollX, scrollY, zoom } = parsed as Partial<ViewportSnapshot>;
    if (
      !isFiniteNumber(scrollX) ||
      !isFiniteNumber(scrollY) ||
      !isFiniteNumber(zoom) ||
      zoom <= 0
    ) {
      return null;
    }
    return { scrollX, scrollY, zoom };
  } catch {
    return null;
  }
};

export const createViewportPersistence = (api: Pick<ExcalidrawImperativeAPI, 'updateScene'>) => {
  let lastViewport: ScopedViewport | null = null;

  return {
    onViewportChange(fileId: string, page: number, scrollX: number, scrollY: number, zoom: number) {
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
      lastViewport = { fileId, page, scrollX, scrollY, zoom };
    },
    persistViewport() {
      if (!lastViewport) {
        return;
      }
      const { fileId, page, scrollX, scrollY, zoom } = lastViewport;
      try {
        sessionStorage.setItem(
          viewportKey(fileId, page),
          JSON.stringify({ scrollX, scrollY, zoom }),
        );
      } catch {
        // storage unavailable
      }
    },
    tryRestoreViewport(fileId: string, page: number): boolean {
      const key = viewportKey(fileId, page);
      let raw: string | null = null;
      try {
        raw = sessionStorage.getItem(key);
        // drop the stored value immediately: never restore a stale viewport later
        sessionStorage.removeItem(key);
      } catch {
        // storage unavailable
      }
      const viewport = raw ? parseViewport(raw) : null;
      if (!viewport) {
        // nothing stored for this scope: forget the previous scope so it is
        // never re-persisted under the wrong key after switching pages
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
    toolPersistence.tryRestore();
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
    viewportPersistence?.persistViewport();
    scopeRef.current = { fileId: currentFileId, page: currentPage };
  }, [currentFileId, currentPage, viewportPersistence]);

  // persist on unmount only: the imperative API is unsafe during teardown.
  useEffect(() => {
    return () => {
      toolPersistence?.persist();
      viewportPersistence?.persistViewport();
    };
  }, [toolPersistence, viewportPersistence]);

  /** Restores the stored viewport of `fileId:page`; true when it was applied. */
  const tryRestoreViewport = useCallback(
    (fileId: string, page: number) => {
      bootstrappedRef.current = true;
      return viewportPersistence?.tryRestoreViewport(fileId, page) ?? false;
    },
    [viewportPersistence],
  );

  return { tryRestoreViewport };
};

export default useWhiteboardSessionPersistence;
