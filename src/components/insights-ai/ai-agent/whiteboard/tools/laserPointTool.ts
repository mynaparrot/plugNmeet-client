import { store } from '../../../../../store';
import { ensureBoardOpen } from '../agentElements';
import { toBBox } from '../layoutEngine';
import { cancelPendingWhiteboardVisionPush } from '../useVisionSync';

const TOOL_NAME = 'whiteboard_laser_point';
/** Fixed identity so every peer draws the same single agent cursor. */
const POINTER_ID = 'ai_agent_pointer';
const DEFAULT_DURATION_MS = 1600;
const MIN_DURATION_MS = 500;
const MAX_DURATION_MS = 6000;
const MAX_HOLD_MS = 5000;
const LASER_COLOR = '#e03131';
const CIRCLE_POINTS = 32;
const CIRCLE_PADDING = 24;
/** A single tap becomes a small loop, otherwise the trail is one tick long. */
const POINT_LOOP_RADIUS = 18;
const POINT_LOOP_STEPS = 16;
/** Longer path segments are filled in, so the trail glides instead of jumping. */
const PATH_MIN_SEGMENT_PX = 20;
const PATH_SEGMENT_STEPS = 8;
const PATH_MAX_SEGMENT_STEPS = 12;
/** Bounds the whole motion so a dense path cannot run for minutes. */
const MAX_MOTION_POINTS = 320;

export type PointerPoint = { x: number; y: number };

let cancelCurrent: (() => void) | null = null;

const agentName = (): string =>
  store.getState().session.currentRoom.metadata?.roomFeatures?.insightsFeatures?.aiAgentFeatures
    ?.agentDisplayName || 'AI Assistant';

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(num)));
};

const readPoint = (x: unknown, y: unknown): PointerPoint | null => {
  const px = Number(x);
  const py = Number(y);
  return Number.isFinite(px) && Number.isFinite(py) ? { x: px, y: py } : null;
};

const circleAround = (box: {
  x: number;
  y: number;
  width: number;
  height: number;
}): PointerPoint[] => {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const radiusX = box.width / 2 + CIRCLE_PADDING;
  const radiusY = box.height / 2 + CIRCLE_PADDING;
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
const loopAroundPoint = ({ x, y }: PointerPoint): PointerPoint[] => {
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
const interpolatePath = (waypoints: PointerPoint[]): PointerPoint[] => {
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
const boundsOfPoints = (points: PointerPoint[]) => {
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

/**
 * `whiteboard_laser_point`: moves the agent's cursor along a point, a path or a
 * loop around an element, then retracts it. Pointing is presentation, not
 * editing, so it never consults the local write permission.
 */
export const executeWhiteboardLaserPointTool = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const motion = (args.motion ?? {}) as Record<string, unknown>;
  const kind = ['point', 'path', 'circle_element'].includes(String(motion.kind))
    ? (String(motion.kind) as 'point' | 'path' | 'circle_element')
    : 'point';

  const lookup = await ensureBoardOpen();
  if ('error' in lookup) {
    return { ok: false, error: lookup.error };
  }
  const board = lookup.board;

  let points: PointerPoint[] = [];
  if (kind === 'circle_element') {
    const targetId = typeof motion.target_element_id === 'string' ? motion.target_element_id : '';
    const element = board.elements.find((candidate) => candidate.id === targetId);
    if (!element) {
      return { ok: false, error: `element "${targetId}" was not found on this page.` };
    }
    points = circleAround(toBBox(element));
  } else if (kind === 'path') {
    const raw = Array.isArray(motion.path) ? motion.path : [];
    points = raw
      .map((entry) => readPoint((entry as PointerPoint)?.x, (entry as PointerPoint)?.y))
      .filter((point): point is PointerPoint => point !== null);
  } else {
    const point = readPoint(motion.x, motion.y);
    if (point) {
      points = [point];
    }
  }

  if (points.length === 0) {
    return { ok: false, error: 'motion did not resolve to any point on the board.' };
  }
  if (points.length === 1) {
    points = loopAroundPoint(points[0]);
  } else if (kind === 'path') {
    points = interpolatePath(points);
  }
  points = points.slice(0, MAX_MOTION_POINTS);

  const durationMs = clampInt(
    args.duration_ms,
    MIN_DURATION_MS,
    MAX_DURATION_MS,
    DEFAULT_DURATION_MS,
  );
  const holdMs = clampInt(args.hold_ms, 0, MAX_HOLD_MS, 0);
  const pointerTool = args.tool === 'pointer' ? 'pointer' : 'laser';
  const name = agentName();

  // A new laser replaces the running one instead of fighting over the cursor.
  cancelCurrent?.();
  cancelPendingWhiteboardVisionPush();

  // Pointing at something off-screen teaches nobody: reveal the area first and
  // let every follower land on it.
  board.controller.revealBBoxInViewport(boundsOfPoints(points));

  const stepMs = Math.max(16, Math.round(durationMs / Math.max(points.length, 1)));
  let step = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const stop = () => {
    cancelled = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    board.controller.setExternalCollaboratorPointer(POINTER_ID, name, null);
    if (cancelCurrent === stop) {
      cancelCurrent = null;
    }
  };
  cancelCurrent = stop;

  const tick = () => {
    if (cancelled) {
      return;
    }
    if (step >= points.length) {
      // Hold the last position, then retract the pointer.
      timer = setTimeout(stop, holdMs);
      return;
    }
    const point = points[step++];
    board.controller.setExternalCollaboratorPointer(
      POINTER_ID,
      name,
      { x: point.x, y: point.y, tool: pointerTool },
      LASER_COLOR,
    );
    timer = setTimeout(tick, stepMs);
  };

  tick();

  const target = points[points.length - 1];
  return { ok: true, x: target.x, y: target.y, tool: TOOL_NAME, duration_ms: durationMs };
};
