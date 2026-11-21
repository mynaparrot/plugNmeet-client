import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { store } from '../../../../store';
import type { BoardContext } from './agentElements';
import { toBBox, unionBBox, type BBox } from './layoutEngine';

export type PointerPoint = { x: number; y: number };

/** Fixed identity so every peer draws the same single agent cursor. */
const POINTER_ID = 'ai_agent_pointer';
const LASER_COLOR = '#e03131';
const DEFAULT_DURATION_MS = 1600;
const CIRCLE_POINTS = 32;
const CIRCLE_PADDING = 24;
const POINT_LOOP_RADIUS = 18;
const POINT_LOOP_STEPS = 16;
/** Longer path segments are filled in, so the trail glides instead of jumping. */
const PATH_MIN_SEGMENT_PX = 20;
const PATH_SEGMENT_STEPS = 8;
const PATH_MAX_SEGMENT_STEPS = 12;
/** Bounds the whole motion so a dense path cannot run for minutes. */
const MAX_MOTION_POINTS = 320;

/** Automatic cues are shorter than a deliberate `whiteboard_laser_point`. */
const TRACE_DURATION_MS = 1100;
const TRACE_HOLD_MS = 250;
/** Tighter than the pointing tool's loop, so a large drawing stays in frame. */
const TRACE_PADDING = Math.min(CIRCLE_PADDING, 18);
const TRACE_SWEEP_STEPS = 16;
/** Taller than one line of prose, so the cue circles instead of underlining. */
const SINGLE_LINE_MAX_HEIGHT = 56;
/** The sweep runs a little past both ends, so it visually underlines the words. */
const SWEEP_OVERHANG_X = 4;
/** Just below the text line, so the trail clears descenders. */
const SWEEP_BASELINE_GAP = 6;
const WRITING_TYPES: ReadonlySet<string> = new Set(['text', 'line']);

/** One slot, so a new motion retracts the running one instead of racing it. */
let cancelCurrent: (() => void) | null = null;

const agentName = (): string =>
  store.getState().session.currentRoom.metadata?.roomFeatures?.insightsFeatures?.aiAgentFeatures
    ?.agentDisplayName || 'AI Assistant';

const publishPointer = (
  board: BoardContext,
  point: PointerPoint | null,
  tool: 'laser' | 'pointer' = 'laser',
): boolean => {
  const publish: BoardContext['controller']['setExternalCollaboratorPointer'] | undefined =
    board.controller?.setExternalCollaboratorPointer;
  if (typeof publish !== 'function') {
    return false;
  }
  const name = agentName();
  if (!point) {
    publish(POINTER_ID, name, null);
    return true;
  }
  publish(POINTER_ID, name, { x: Math.round(point.x), y: Math.round(point.y), tool }, LASER_COLOR);
  return true;
};

export const circleAround = ({ x, y, width, height }: BBox, padding = CIRCLE_PADDING) => {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radiusX = width / 2 + padding;
  const radiusY = height / 2 + padding;
  const points: PointerPoint[] = [];
  for (let step = 0; step <= CIRCLE_POINTS; step++) {
    const angle = (step / CIRCLE_POINTS) * Math.PI * 2;
    points.push({
      x: Math.round(centerX + radiusX * Math.cos(angle)),
      y: Math.round(centerY + radiusY * Math.sin(angle)),
    });
  }
  return points;
};

/** A small smooth loop that ends on the target, so a single tap still draws. */
export const loopAroundPoint = ({ x, y }: PointerPoint): PointerPoint[] => {
  const points: PointerPoint[] = [];
  for (let step = 0; step < POINT_LOOP_STEPS; step++) {
    const angle = (step / POINT_LOOP_STEPS) * Math.PI * 2;
    points.push({
      x: Math.round(x + POINT_LOOP_RADIUS * Math.cos(angle)),
      y: Math.round(y + POINT_LOOP_RADIUS * Math.sin(angle)),
    });
  }
  points.push({ x: Math.round(x), y: Math.round(y) });
  return points;
};

/** Fills long waypoint gaps with intermediate points so the trail stays smooth. */
const interpolatePath = (waypoints: readonly PointerPoint[]): PointerPoint[] => {
  const points: PointerPoint[] = [];
  for (let index = 0; index < waypoints.length - 1; index++) {
    const from = waypoints[index];
    const to = waypoints[index + 1];
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps =
      distance > PATH_MIN_SEGMENT_PX
        ? Math.min(
            PATH_MAX_SEGMENT_STEPS,
            Math.max(PATH_SEGMENT_STEPS, Math.round(distance / PATH_MIN_SEGMENT_PX)),
          )
        : 1;
    for (let step = 0; step < steps; step++) {
      const ratio = step / steps;
      points.push({
        x: Math.round(from.x + (to.x - from.x) * ratio),
        y: Math.round(from.y + (to.y - from.y) * ratio),
      });
    }
  }
  points.push(waypoints[waypoints.length - 1]);
  return points;
};

/** Scene rectangle around the motion, padded so the trail is never clipped. */
const boundsOfPoints = (points: readonly PointerPoint[]): BBox => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs) - CIRCLE_PADDING;
  const minY = Math.min(...ys) - CIRCLE_PADDING;
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) + CIRCLE_PADDING - minX,
    height: Math.max(...ys) + CIRCLE_PADDING - minY,
  };
};

export type LaserMotionOptions = {
  durationMs?: number;
  holdMs?: number;
  tool?: 'laser' | 'pointer';
  /** False when the caller already brought the target into view. */
  reveal?: boolean;
};

/**
 * Animates the agent's pointer along `points`, then retracts it. Returns the
 * final point without waiting: a tool result must never wait for the animation.
 */
export const runLaserMotion = (
  board: BoardContext,
  points: readonly PointerPoint[],
  options: LaserMotionOptions = {},
): PointerPoint | null => {
  if (points.length === 0) {
    return null;
  }
  const motion = interpolatePath(points).slice(0, MAX_MOTION_POINTS);
  const durationMs = Math.max(1, Math.round(options.durationMs ?? DEFAULT_DURATION_MS));
  const holdMs = Math.max(0, Math.round(options.holdMs ?? 0));
  const tool = options.tool === 'pointer' ? 'pointer' : 'laser';
  const stepMs = Math.max(16, Math.round(durationMs / motion.length));

  // A new motion replaces the running one instead of fighting over the cursor.
  cancelCurrent?.();
  // Pointing at something off-screen teaches nobody: reveal the area first and
  // let every follower land on it.
  if (options.reveal !== false) {
    board.controller.revealBBoxInViewport(boundsOfPoints(motion));
  }

  let step = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const stop = () => {
    cancelled = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    publishPointer(board, null);
    if (cancelCurrent === stop) {
      cancelCurrent = null;
    }
  };
  cancelCurrent = stop;

  const tick = () => {
    if (cancelled) {
      return;
    }
    if (step >= motion.length) {
      // Hold the last position, then retract the pointer.
      timer = setTimeout(stop, holdMs);
      return;
    }
    publishPointer(board, motion[step++], tool);
    timer = setTimeout(tick, stepMs);
  };

  tick();
  return motion[motion.length - 1];
};

/** Moves the agent's pointer to a single scene point (or retracts it with `null`). */
export const pointAgentLaserAt = (board: BoardContext, point: PointerPoint | null): void => {
  publishPointer(board, point);
};

const textOf = (element: ExcalidrawElement): string => (element as { text?: string }).text ?? '';

/**
 * Only one line of prose reads as an underline. A wrapped or multi-line block,
 * a heading plus its body, a card, a table or a drawing all get circled.
 */
const isSingleLineWriting = (elements: readonly ExcalidrawElement[], bbox: BBox): boolean =>
  bbox.height <= SINGLE_LINE_MAX_HEIGHT &&
  elements.every((element) => WRITING_TYPES.has(element.type) && !textOf(element).includes('\n'));

/** Sweeps under the single line of text, left to right, along one straight baseline. */
const underlineSweep = (bbox: BBox): PointerPoint[] => {
  const baseline = Math.round(bbox.y + bbox.height + SWEEP_BASELINE_GAP);
  const startX = Math.round(bbox.x - SWEEP_OVERHANG_X);
  const endX = Math.round(bbox.x + bbox.width + SWEEP_OVERHANG_X);
  const points: PointerPoint[] = [];
  for (let step = 0; step <= TRACE_SWEEP_STEPS; step++) {
    const ratio = step / TRACE_SWEEP_STEPS;
    points.push({ x: Math.round(startX + (endX - startX) * ratio), y: baseline });
  }
  return points;
};

export type LaserTraceOptions = { durationMs?: number; holdMs?: number };

/**
 * Points at what the agent just wrote: a straight underline sweep under a
 * single line of text, a loop around anything else. Fire and forget, so
 * committing never waits for the animation.
 */
export const traceElementsWithLaser = (
  board: BoardContext,
  elements: readonly ExcalidrawElement[],
  options: LaserTraceOptions = {},
): void => {
  if (
    elements.length === 0 ||
    typeof board.controller?.setExternalCollaboratorPointer !== 'function'
  ) {
    return;
  }
  const bbox = unionBBox(elements.map(toBBox));
  const points = isSingleLineWriting(elements, bbox)
    ? underlineSweep(bbox)
    : circleAround(bbox, TRACE_PADDING);
  runLaserMotion(board, points, {
    durationMs: options.durationMs ?? TRACE_DURATION_MS,
    holdMs: options.holdMs ?? TRACE_HOLD_MS,
    tool: 'laser',
    // The caller has already brought the block into view; scrolling again would
    // yank the page while the laser is drawing.
    reveal: false,
  });
};
