import { useEffect, useMemo } from 'react';
import type { AppState, ExcalidrawImperativeAPI, ToolType } from '@excalidraw/excalidraw/types';

const ACTIVE_TOOL_STORAGE_KEY = 'pnm-whiteboard-active-tool';

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

interface IUseWhiteboardActiveToolPersistence {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  viewModeEnabled: boolean;
}

const useWhiteboardActiveToolPersistence = ({
  excalidrawAPI,
  viewModeEnabled,
}: IUseWhiteboardActiveToolPersistence) => {
  const persistence = useMemo(
    () => (excalidrawAPI ? createActiveToolPersistence(excalidrawAPI) : null),
    [excalidrawAPI],
  );

  useEffect(() => {
    if (!excalidrawAPI || !persistence || viewModeEnabled) {
      return;
    }
    const unsubscribe = excalidrawAPI.onStateChange('activeTool', persistence.onToolChange);
    persistence.tryRestore();
    return unsubscribe;
  }, [excalidrawAPI, persistence, viewModeEnabled]);

  // persist on unmount only: the imperative API is unsafe during teardown.
  useEffect(() => {
    return () => {
      persistence?.persist();
    };
  }, [persistence]);
};

export default useWhiteboardActiveToolPersistence;
