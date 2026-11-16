import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import {
  agentCustomData,
  agentElementId,
  asCustomData,
  commitAgentElements,
  drawnResult,
  ensureBoardOpen,
  formatWhiteboardText,
  invalid,
  resolveContrastingStrokeColor,
  resolveFillColor,
  toExcalidrawElements,
  type BoardContext,
} from '../agentElements';
import {
  anchoredElementId,
  clampToA4Bounds,
  findAnchorBox,
  fitInside,
  insideBox,
  readLayout,
  resolveExplicitOrFreePlacement,
  sceneBoxes,
  toBBox,
  type BBox,
  type LayoutMode,
} from '../layoutEngine';
import { findWordBoxInElement } from '../sceneGraph';

const TOOL_NAME = 'whiteboard_draw_shapes';
/** A word mark hugs the word, so the padding never inflates it into a paragraph. */
const MAX_WORD_PADDING = 6;
/** Gap between a word's baseline and the underline drawn under it. */
const UNDERLINE_GAP = 2;

const SHAPE_TYPES = ['rectangle', 'ellipse', 'diamond', 'arrow', 'line'] as const;
const FILL_STYLES = ['hachure', 'cross-hatch', 'solid'] as const;
const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 120;

type ShapeType = (typeof SHAPE_TYPES)[number];

type ShapeInput = {
  type: ShapeType;
  label?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** The colour name the model asked for, kept raw for contrast resolution. */
  rawStrokeColor?: string;
  backgroundColor: string;
  fillStyle: (typeof FILL_STYLES)[number];
  strokeWidth: number;
  targetElementId?: string;
  targetText?: string;
  padding: number;
  startElementId?: string;
  endElementId?: string;
  /** `layout` or its alias `placement`, kept raw until validated. */
  layout?: unknown;
  anchorElementId?: string;
};

const asNumber = (value: unknown): number | undefined => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const asString = (value: unknown): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
};

const readShapes = (raw: unknown): ShapeInput[] | null => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  const shapes: ShapeInput[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const type = (SHAPE_TYPES as readonly string[]).includes(String(record.type))
      ? (record.type as ShapeType)
      : 'rectangle';
    const strokeWidth = asNumber(record.stroke_width);
    const padding = asNumber(record.padding);
    const label = asString(record.label);

    shapes.push({
      type,
      label: label ? formatWhiteboardText(label) : undefined,
      x: asNumber(record.x),
      y: asNumber(record.y),
      width: asNumber(record.width),
      height: asNumber(record.height),
      rawStrokeColor: asString(record.stroke_color),
      backgroundColor: resolveFillColor(record.background_color),
      fillStyle: (FILL_STYLES as readonly string[]).includes(String(record.fill_style))
        ? (record.fill_style as ShapeInput['fillStyle'])
        : 'hachure',
      strokeWidth:
        strokeWidth !== undefined && strokeWidth >= 1 && strokeWidth <= 4
          ? Math.round(strokeWidth)
          : 2,
      targetElementId: asString(record.target_element_id),
      targetText: asString(record.target_text),
      padding: padding !== undefined && padding >= 4 && padding <= 64 ? padding : 16,
      startElementId: asString(record.start_element_id),
      endElementId: asString(record.end_element_id),
      layout: record.layout ?? record.placement,
      anchorElementId: asString(record.anchor_element_id),
    });
  }

  return shapes.length > 0 ? shapes : null;
};

const bboxOf = (board: BoardContext, id?: string): BBox | null => {
  if (!id) {
    return null;
  }
  const found = board.elements.find((element) => element.id === id);
  return found ? toBBox(found) : null;
};

const centerOf = (box: BBox) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

/** Arrow/line geometry from the two bound elements, else from the given box. */
const linearGeometry = (shape: ShapeInput, start: BBox | null, end: BBox | null) => {
  if (start && end) {
    const from = centerOf(start);
    const to = centerOf(end);
    return { x: from.x, y: from.y, width: to.x - from.x, height: to.y - from.y };
  }
  return null;
};

const isUnderline = (shape: ShapeInput) => shape.type === 'line' || shape.type === 'arrow';

/** An underline is a flat line right under the word it marks. */
const underlineGeometry = (box: BBox) => ({
  x: Math.round(box.x),
  y: Math.round(box.y + box.height + UNDERLINE_GAP),
  width: Math.max(12, Math.round(box.width)),
  height: 0,
});

/** A mark on one word stays tight, or it would read as marking the line. */
const wordMarkGeometry = (box: BBox, padding: number) => ({
  x: Math.round(box.x - padding),
  y: Math.round(box.y - padding),
  width: Math.round(box.width + padding * 2),
  height: Math.round(box.height + padding * 2),
});

/** A line aimed at a whole element underlines it along its bottom edge. */
const bottomEdgeGeometry = (box: BBox) => ({
  x: Math.round(box.x),
  y: Math.round(box.y + box.height + UNDERLINE_GAP * 2),
  width: Math.round(box.width),
  height: 0,
});

/**
 * `whiteboard_draw_shapes`: geometric shapes with bound labels, including
 * "wrap this existing element" so the agent can circle participant work
 * without guessing coordinates.
 */
export const executeWhiteboardDrawShapesTool = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const shapes = readShapes(args.shapes);
  if (!shapes) {
    return invalid('shapes must be a non-empty array of { type } objects.');
  }

  const lookup = await ensureBoardOpen();
  if ('error' in lookup) {
    return invalid(lookup.error);
  }
  const context = lookup.board;

  const data = asCustomData(agentCustomData(TOOL_NAME));
  const byId = new Map(context.elements.map((element) => [element.id, element]));
  const skeletons: unknown[] = [];
  const placedBoxes: BBox[] = [];
  // A shape anchored to one element of a batch is measured against that element,
  // everything else against the whole batch: the scene boxes are cached per
  // anchor, and the shapes placed by this call block their own successors.
  const sceneBoxCache = new Map<string, readonly BBox[]>();
  const boxesFor = (layout: LayoutMode, rawAnchorId?: string): BBox[] => {
    const anchorId = anchoredElementId(layout, rawAnchorId);
    const key = anchorId ?? '';
    let scene = sceneBoxCache.get(key);
    if (!scene) {
      scene = sceneBoxes(context.elements, anchorId);
      sceneBoxCache.set(key, scene);
    }
    return [...scene, ...placedBoxes];
  };
  // The model may set layout/anchor for the whole call or for one shape.
  const topLayout = args.layout ?? args.placement;
  const topAnchorId = asString(args.anchor_element_id);

  for (const shape of shapes) {
    const start = bboxOf(context, shape.startElementId);
    const end = bboxOf(context, shape.endElementId);
    const layout = readLayout(shape.layout ?? topLayout);
    const anchorId = shape.anchorElementId ?? topAnchorId;
    const anchor = findAnchorBox(context.elements, anchorId);
    const linear =
      shape.type === 'arrow' || shape.type === 'line' ? linearGeometry(shape, start, end) : null;
    const targetElement = shape.targetElementId ? byId.get(shape.targetElementId) : undefined;
    const target = targetElement ? toBBox(targetElement) : null;
    // A word inside the target is located from the scene metadata, so the mark
    // lands on the mistake instead of on a guessed coordinate.
    const wordBox =
      targetElement && shape.targetText && !linear
        ? findWordBoxInElement(targetElement, byId, shape.targetText)
        : null;

    let geometry: { x: number; y: number; width: number; height: number };
    if (wordBox) {
      geometry = isUnderline(shape)
        ? underlineGeometry(wordBox)
        : wordMarkGeometry(wordBox, Math.min(shape.padding, MAX_WORD_PADDING));
    } else if (target && !linear && shape.type === 'line') {
      // A line aimed at an element underlines that element.
      geometry = bottomEdgeGeometry(target);
    } else if (target && !linear && layout === 'inside_element') {
      // Inside the element on purpose (a sun in the participant's circle), so
      // the shape is fitted and centred there instead of wrapped around it.
      const size = fitInside(
        { width: shape.width ?? DEFAULT_WIDTH, height: shape.height ?? DEFAULT_HEIGHT },
        layout,
        target,
      );
      const placed = clampToA4Bounds(insideBox(target, size), size, context.frame);
      geometry = { x: placed.x, y: placed.y, width: size.width, height: size.height };
    } else if (target && !linear) {
      // Wrapping an existing element ignores x/y/width/height on purpose: the
      // annotation has to land on the element, not where the model guessed.
      const padding = shape.padding;
      geometry = {
        x: Math.round(target.x - padding),
        y: Math.round(target.y - padding),
        width: Math.round(target.width + padding * 2),
        height: Math.round(target.height + padding * 2),
      };
    } else if (linear) {
      geometry = {
        x: Math.round(linear.x),
        y: Math.round(linear.y),
        width: Math.round(linear.width),
        height: Math.round(linear.height),
      };
    } else {
      const size = fitInside(
        { width: shape.width ?? DEFAULT_WIDTH, height: shape.height ?? DEFAULT_HEIGHT },
        layout,
        anchor,
      );
      const position = resolveExplicitOrFreePlacement(
        boxesFor(layout, anchorId),
        context.frame,
        size,
        shape.x,
        shape.y,
        layout,
        anchor,
      );
      geometry = { x: position.x, y: position.y, width: size.width, height: size.height };
    }

    placedBoxes.push({ ...geometry });

    const skeleton: Record<string, unknown> = {
      id: agentElementId(),
      type: shape.type,
      x: geometry.x,
      y: geometry.y,
      width: geometry.width,
      height: geometry.height,
      // A mark on the participant's element must never use their own colour.
      strokeColor: resolveContrastingStrokeColor(shape.rawStrokeColor, targetElement?.strokeColor),
      strokeWidth: shape.strokeWidth,
      customData: data,
    };

    if (shape.type === 'rectangle' || shape.type === 'ellipse' || shape.type === 'diamond') {
      skeleton.backgroundColor = shape.backgroundColor;
      skeleton.fillStyle = shape.fillStyle;
    }
    if (shape.label) {
      skeleton.label = { text: shape.label, fontFamily: 1 };
    }
    if (start) {
      skeleton.start = { id: shape.startElementId };
    }
    if (end) {
      skeleton.end = { id: shape.endElementId };
    }

    skeletons.push(skeleton);
  }

  const elements: ExcalidrawElement[] = await toExcalidrawElements(skeletons, TOOL_NAME);
  if (!commitAgentElements(context, elements, { toolName: TOOL_NAME })) {
    return invalid('The whiteboard refused the write.');
  }

  return drawnResult(elements);
};
