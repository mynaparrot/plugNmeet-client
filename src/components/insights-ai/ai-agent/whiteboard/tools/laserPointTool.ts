import { circleAround, loopAroundPoint, runLaserMotion, type PointerPoint } from '../agentLaser';
import { ensureBoardOpen } from '../agentElements';
import { toBBox } from '../layoutEngine';
import { cancelPendingWhiteboardVisionPush } from '../useVisionSync';

const TOOL_NAME = 'whiteboard_laser_point';
const DEFAULT_DURATION_MS = 1600;
const MIN_DURATION_MS = 500;
const MAX_DURATION_MS = 6000;
const MAX_HOLD_MS = 5000;

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
  }

  const durationMs = clampInt(
    args.duration_ms,
    MIN_DURATION_MS,
    MAX_DURATION_MS,
    DEFAULT_DURATION_MS,
  );
  const holdMs = clampInt(args.hold_ms, 0, MAX_HOLD_MS, 0);
  const tool = args.tool === 'pointer' ? 'pointer' : 'laser';

  // The laser itself tells the vision model what is being pointed at, so the
  // snapshot that would push the same change is dropped.
  cancelPendingWhiteboardVisionPush();

  const target = runLaserMotion(board, points, { durationMs, holdMs, tool, reveal: true });
  if (!target) {
    return { ok: false, error: 'motion did not resolve to any point on the board.' };
  }
  return { ok: true, x: target.x, y: target.y, tool: TOOL_NAME, duration_ms: durationMs };
};
