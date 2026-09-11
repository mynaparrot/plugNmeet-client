import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { store, useAppDispatch } from '../../../store';
import { updateIsEnabledExtendedVerticalCamView } from '../../../store/slices/bottomIconsActivitySlice';
import {
  APP_LAYOUT_CLASSES,
  MAIN_AREA_DIMENSIONS,
} from '../../../helpers/dimensions';

export const SIDE_PANEL_MIN_WIDTH = MAIN_AREA_DIMENSIONS.sidePanel.minWidth;
export const SIDE_PANEL_MAX_WIDTH = MAIN_AREA_DIMENSIONS.sidePanel.maxWidth;

// Fallbacks mirror the var() defaults in APP_LAYOUT_CLASSES.sidePanel.width.
const DEFAULT_WIDTH = APP_LAYOUT_CLASSES.sidePanel.defaultWidth;
const DEFAULT_WIDTH_WIDE = APP_LAYOUT_CLASSES.sidePanel.defaultWidthWide;
const WIDE_BREAKPOINT_PX = MAIN_AREA_DIMENSIONS.breakpoints.wide;
const PC_BREAKPOINT_PX = MAIN_AREA_DIMENSIONS.breakpoints.pc;
const STORAGE_KEY = 'pnm-sidePanel-width';

export interface ISidePanelDragHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
}

interface IUseSidePanelResizeOptions {
  isRecorder: boolean;
  onResizeEnd?: () => void;
}

const clampWidth = (width: number) =>
  Math.min(
    SIDE_PANEL_MAX_WIDTH,
    Math.max(SIDE_PANEL_MIN_WIDTH, Math.round(width)),
  );

const getDefaultPanelWidth = () =>
  window.innerWidth >= WIDE_BREAKPOINT_PX ? DEFAULT_WIDTH_WIDE : DEFAULT_WIDTH;

const loadStoredWidth = (): number | null => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    if (
      !Number.isFinite(parsed) ||
      parsed < SIDE_PANEL_MIN_WIDTH ||
      parsed > SIDE_PANEL_MAX_WIDTH
    ) {
      return null;
    }
    return Math.round(parsed);
  } catch {
    return null;
  }
};

const persistWidth = (width: number | null) => {
  try {
    if (width == null) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, String(width));
    }
  } catch {
    // storage may be unavailable (private mode); resizing still works.
  }
};

/**
 * PC-only draggable side panel width. Fully disabled for the recorder,
 * which keeps its fixed layout (no stored width, no CSS var, no handle).
 *
 * `null` means "not customized yet" so the default Tailwind widths
 * (300px, 340px on 3xl) apply. Any number is exposed to the layout via the
 * `--side-panel-width` CSS var on `#main-area`, which keeps it responsive:
 * mobile/tablet keep their bottom-sheet/full-width styles.
 */
export const useSidePanelResize = ({
  isRecorder,
  onResizeEnd,
}: IUseSidePanelResizeOptions) => {
  const dispatch = useAppDispatch();
  const [panelWidth, setPanelWidth] = useState<number | null>(() =>
    isRecorder ? null : loadStoredWidth(),
  );
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const widthRef = useRef<number | null>(panelWidth);
  widthRef.current = panelWidth;
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
    prevWidth: number | null;
  } | null>(null);
  const pendingRef = useRef<number | null>(null);
  const isRecorderRef = useRef(isRecorder);
  isRecorderRef.current = isRecorder;
  const onResizeEndRef = useRef(onResizeEnd);
  onResizeEndRef.current = onResizeEnd;

  const setMainAreaVar = useCallback((width: number | null) => {
    const el = document.getElementById('main-area');
    if (!el) {
      return;
    }
    if (width == null) {
      el.style.removeProperty('--side-panel-width');
    } else {
      el.style.setProperty('--side-panel-width', `${width}px`);
    }
  }, []);

  // Keep the var in sync for committed changes (nudge, reset, remount).
  // During a drag the var is updated directly for 60fps without re-renders.
  // Recorder keeps the fixed layout: never set the var.
  useEffect(() => {
    if (isRecorder) {
      setMainAreaVar(null);
      return;
    }
    setMainAreaVar(panelWidth);
  }, [panelWidth, setMainAreaVar, isRecorder]);

  const cleanupDragStyles = useCallback(() => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Safety net if the component unmounts mid-drag.
  useEffect(() => cleanupDragStyles, [cleanupDragStyles]);

  const handleDragStart = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (isRecorderRef.current) {
        return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) {
        return;
      }
      if (window.innerWidth < PC_BREAKPOINT_PX) {
        return;
      }
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);

      const prevWidth = widthRef.current;
      const startWidth = prevWidth ?? getDefaultPanelWidth();
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startWidth,
        prevWidth,
      };
      pendingRef.current = startWidth;
      // Commit immediately so the layout switches to var-based widths
      // before the first pointermove arrives.
      setPanelWidth(startWidth);
      setIsResizing(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      // The extended vertical strip (416px) + a widened panel would leave
      // (almost) no room for the main content, so force the strip back to
      // its normal 212px size while resizing. The user can re-enable the
      // extended view afterwards via its toggle if space allows.
      if (
        !isRecorderRef.current &&
        store.getState().bottomIconsActivity.isEnabledExtendedVerticalCamView
      ) {
        dispatch(updateIsEnabledExtendedVerticalCamView(false));
      }
    },
    [dispatch],
  );

  const handleDragMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) {
        return;
      }
      // Panel is docked to `end`: LTR = right edge, dragging left widens.
      const isRTL = document.documentElement.dir === 'rtl';
      const dx = e.clientX - drag.startX;
      const next = clampWidth(drag.startWidth + (isRTL ? dx : -dx));
      pendingRef.current = next;
      setMainAreaVar(next);
    },
    [setMainAreaVar],
  );

  const handleDragEnd = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) {
        return;
      }
      const next = pendingRef.current ?? drag.startWidth;
      dragRef.current = null;
      pendingRef.current = null;
      cleanupDragStyles();
      setIsResizing(false);
      setPanelWidth(next);
      persistWidth(next);
      onResizeEndRef.current?.();
    },
    [cleanupDragStyles],
  );

  const handleDragCancel = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) {
        return;
      }
      const prevWidth = drag.prevWidth;
      dragRef.current = null;
      pendingRef.current = null;
      cleanupDragStyles();
      setIsResizing(false);
      // Revert to the width from before the drag started.
      setPanelWidth(prevWidth);
      persistWidth(prevWidth);
    },
    [cleanupDragStyles],
  );

  const nudgeWidth = useCallback((delta: number) => {
    if (isRecorderRef.current) {
      return;
    }
    if (window.innerWidth < PC_BREAKPOINT_PX) {
      return;
    }
    const next = clampWidth(
      (widthRef.current ?? getDefaultPanelWidth()) + delta,
    );
    setPanelWidth(next);
    persistWidth(next);
  }, []);

  const resetWidth = useCallback(() => {
    if (isRecorderRef.current) {
      return;
    }
    setPanelWidth(null);
    persistWidth(null);
  }, []);

  const dragHandleProps: ISidePanelDragHandleProps | null = isRecorder
    ? null
    : {
        onPointerDown: handleDragStart,
        onPointerMove: handleDragMove,
        onPointerUp: handleDragEnd,
        onPointerCancel: handleDragCancel,
      };

  return { panelWidth, isResizing, dragHandleProps, nudgeWidth, resetWidth };
};
