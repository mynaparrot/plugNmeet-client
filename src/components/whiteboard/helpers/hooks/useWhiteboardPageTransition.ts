import { useCallback, useEffect, useRef, useState } from 'react';

import type { PageTransitionDirection } from '../navigationQueue';

const STAGE_SELECTOR = '.wb-canvas-stage';
const SOURCE_CANVAS_SELECTOR = 'canvas.excalidraw__canvas.static';
const STAGE_CLASSES = [
  'wb-transition-holding',
  'wb-transition-next',
  'wb-transition-prev',
  'wb-transition-fade',
];
// Backstop for a step that never settles (an office page may legitimately take
// seconds to load); without it a hung switch would keep the canvas hidden.
const SAFETY_TIMEOUT_MS = 3000;
const ANIMATION_MS: Record<PageTransitionDirection, number> = {
  next: 240,
  prev: 240,
  fade: 220,
};

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Two frames: the first lets React/Excalidraw render, the second paints it. */
const afterNextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

/**
 * Keeps the previous page on screen while the next one is being prepared: the
 * last painted canvas frame is copied into an overlay, the stage is hidden
 * underneath it, and only then does the new page animate in.
 */
const useWhiteboardPageTransition = () => {
  const snapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [transitionClass, setTransitionClass] = useState('');
  const stageRef = useRef<HTMLElement | null>(null);
  const directionRef = useRef<PageTransitionDirection>('fade');
  // The overlay currently covers the live canvas.
  const holdingRef = useRef(false);
  // A reveal is waiting for the next paint.
  const revealingRef = useRef(false);
  // Invalidates a reveal that a newer navigation made obsolete.
  const revealTokenRef = useRef(0);
  const safetyTimerRef = useRef<number | undefined>(undefined);
  const cleanupTimerRef = useRef<number | undefined>(undefined);

  const clearTimers = useCallback(() => {
    window.clearTimeout(safetyTimerRef.current);
    window.clearTimeout(cleanupTimerRef.current);
    safetyTimerRef.current = undefined;
    cleanupTimerRef.current = undefined;
  }, []);

  /** Mirrors the state class onto the DOM so it applies before the next paint. */
  const setStageClass = useCallback((className: string) => {
    setTransitionClass(className);
    const stage = stageRef.current;
    if (stage) {
      for (const cls of STAGE_CLASSES) {
        stage.classList.toggle(cls, cls === className);
      }
    }
  }, []);

  const cancelTransition = useCallback(() => {
    clearTimers();
    revealTokenRef.current += 1;
    holdingRef.current = false;
    revealingRef.current = false;
    setStageClass('');
    const canvas = snapshotCanvasRef.current;
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }, [clearTimers, setStageClass]);

  /**
   * Freezes the page that is on screen right now, before the canvas is reset.
   * Called synchronously at the start of every switch, so the copied frame is
   * still the fully painted previous page.
   */
  const captureBeforeReset = useCallback(
    (containerEl: HTMLElement | null, direction: PageTransitionDirection) => {
      if (!containerEl || prefersReducedMotion()) {
        return;
      }
      const stage = containerEl.querySelector<HTMLElement>(STAGE_SELECTOR);
      const snapshot = snapshotCanvasRef.current;
      if (!stage || !snapshot) {
        return;
      }
      stageRef.current = stage;

      // Any scheduled reveal belongs to a transition that is already obsolete.
      revealTokenRef.current += 1;
      revealingRef.current = false;
      clearTimers();
      directionRef.current = direction;

      if (holdingRef.current) {
        // Rapid clicks: the overlay still shows the last visible page, which is
        // exactly what the newest target has to animate away.
        safetyTimerRef.current = window.setTimeout(cancelTransition, SAFETY_TIMEOUT_MS);
        return;
      }

      const source = stage.querySelector<HTMLCanvasElement>(SOURCE_CANVAS_SELECTOR);
      if (!source || source.width === 0 || source.height === 0) {
        return;
      }

      snapshot.width = source.width;
      snapshot.height = source.height;
      const context = snapshot.getContext('2d');
      if (!context) {
        return;
      }
      // The canvas itself is transparent where nothing is drawn: match the
      // whiteboard background so uncovered areas do not flash white.
      const root = stage.querySelector<HTMLElement>('.excalidraw');
      const background = root ? getComputedStyle(root).backgroundColor : '';
      if (background && background !== 'transparent' && background !== 'rgba(0, 0, 0, 0)') {
        context.fillStyle = background;
        context.fillRect(0, 0, snapshot.width, snapshot.height);
      }
      context.drawImage(source, 0, 0);

      holdingRef.current = true;
      setStageClass(STAGE_CLASSES[0]);
      safetyTimerRef.current = window.setTimeout(cancelTransition, SAFETY_TIMEOUT_MS);
    },
    [cancelTransition, clearTimers, setStageClass],
  );

  /** The next page is prepared and painted: animate the snapshot away. */
  const revealPreparedPage = useCallback(() => {
    if (!holdingRef.current || revealingRef.current) {
      return;
    }
    revealingRef.current = true;
    const token = ++revealTokenRef.current;

    void afterNextPaint().then(() => {
      if (revealTokenRef.current !== token || !holdingRef.current) {
        return;
      }
      const direction = directionRef.current;
      holdingRef.current = false;
      revealingRef.current = false;
      setStageClass(`wb-transition-${direction}`);
      clearTimers();
      cleanupTimerRef.current = window.setTimeout(cancelTransition, ANIMATION_MS[direction] + 40);
    });
  }, [cancelTransition, clearTimers, setStageClass]);

  useEffect(() => clearTimers, [clearTimers]);

  return {
    snapshotCanvasRef,
    transitionClass,
    captureBeforeReset,
    revealPreparedPage,
    cancelTransition,
  };
};

export default useWhiteboardPageTransition;
