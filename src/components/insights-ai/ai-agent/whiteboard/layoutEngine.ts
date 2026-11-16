import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import {
  DEFAULT_A4_MARGIN,
  DEFAULT_PAGE_ORIENTATION,
  VIRTUAL_WORKSPACE_HEIGHT,
  VIRTUAL_WORKSPACE_WIDTH,
} from '../../../whiteboard/export-pdf/types';
import { getPageSize } from '../../../whiteboard/export-pdf/utils';
import { A4_BOUNDARY_GUIDE_ID } from '../../../whiteboard/helpers/constants';

export type BBox = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };

/** Gap between two stacked blocks. */
export const BLOCK_GAP = 24;
/** Inset from the A4 guide, so nothing sits on the red line. */
export const FRAME_PADDING = 40;
/** Offset of the right-hand column from the frame's left edge. */
export const RIGHT_COLUMN_X = 620;
/** The board scrolls down three printable A4 pages, never more. */
export const MAX_A4_PAGES = 3;
/** Breathing room between an anchor's edge and what is drawn inside it. */
const INSIDE_PADDING = 16;
/** Smallest an element may shrink to when it has to fit inside an anchor. */
const MIN_FIT_SIZE = 24;

const round = (value: number) => Math.round(value);

/** Width the A4 guide leaves for content: 1120px for the standard 1200px page. */
export const maxA4ContentWidth = (frame: BBox): number =>
  Math.max(200, Math.round(frame.width - FRAME_PADDING * 2));

const minFrameX = (frame: BBox) => round(frame.x + FRAME_PADDING);
const maxFrameX = (frame: BBox) => round(frame.x + frame.width - FRAME_PADDING);
const minFrameY = (frame: BBox) => round(frame.y + FRAME_PADDING);
const maxFrameY = (frame: BBox) => round(frame.y + frame.height * MAX_A4_PAGES - FRAME_PADDING);

/**
 * Keeps a placement inside the A4 width (one page wide, three pages tall).
 * Nothing the agent draws may ever cross the guide's right edge.
 */
export const clampToA4Bounds = (pos: { x: number; y: number }, size: Size, frame: BBox) => {
  const width = Math.min(size.width, maxA4ContentWidth(frame));
  const height = Math.min(size.height, maxFrameY(frame) - minFrameY(frame));
  const x = Math.min(Math.max(round(pos.x), minFrameX(frame)), maxFrameX(frame) - width);
  const y = Math.min(Math.max(round(pos.y), minFrameY(frame)), maxFrameY(frame) - height);
  return { x, y };
};

/**
 * The drawable A4 frame in scene coordinates. The boundary guide carries the
 * exact geometry, but it is presenter-only chrome, so a follower falls back to
 * the standard A4 frame.
 */
export const getBoardFrame = (elements: readonly ExcalidrawElement[]): BBox => {
  const guide = elements.find((el) => el.id === A4_BOUNDARY_GUIDE_ID && !el.isDeleted);
  if (guide) {
    return { x: guide.x, y: guide.y, width: guide.width, height: guide.height };
  }

  const page = getPageSize(DEFAULT_PAGE_ORIENTATION);
  const width = page.width - DEFAULT_A4_MARGIN;
  const height = page.height - DEFAULT_A4_MARGIN;
  return {
    x: (VIRTUAL_WORKSPACE_WIDTH - width) / 2,
    y: (VIRTUAL_WORKSPACE_HEIGHT - height) / 2,
    width,
    height,
  };
};

/** Arrows and lines carry signed dimensions, so the box is always normalized. */
export const toBBox = (element: ExcalidrawElement): BBox => {
  const width = Math.abs(element.width);
  const height = Math.abs(element.height);
  const x = element.width < 0 ? element.x + element.width : element.x;
  const y = element.height < 0 ? element.y + element.height : element.y;
  return { x, y, width, height };
};

export const unionBBox = (boxes: readonly BBox[]): BBox => {
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: round(minX), y: round(minY), width: round(maxX - minX), height: round(maxY - minY) };
};

/** Elements drawn as one stroke between two points bind the shapes they join. */
const LINEAR_TYPES: ReadonlySet<string> = new Set(['arrow', 'line']);

const batchIdOf = (element: ExcalidrawElement): string | null => {
  const batchId = (element.customData as { ai_agent?: { batchId?: unknown } } | undefined)?.ai_agent
    ?.batchId;
  return typeof batchId === 'string' && batchId ? batchId : null;
};

const groupIdsOf = (element: ExcalidrawElement): readonly string[] => {
  const groupIds = (element as { groupIds?: readonly string[] }).groupIds;
  return Array.isArray(groupIds) ? groupIds : [];
};

const containerIdOf = (element: ExcalidrawElement): string | null =>
  (element as { containerId?: string | null }).containerId ?? null;

/** Ids of the two elements a linear element is bound to. */
const bindingsOf = (element: ExcalidrawElement): string[] => {
  if (!LINEAR_TYPES.has(element.type)) {
    return [];
  }
  const start = (element as { startBinding?: { elementId?: string | null } | null }).startBinding;
  const end = (element as { endBinding?: { elementId?: string | null } | null }).endBinding;
  return [start?.elementId, end?.elementId].filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
};

/**
 * Connects the elements that belong together: one agent batch, one Excalidraw
 * group, a bound label and its container, or a shape and the arrow bound to it.
 * Returns one component per connected group, as indexes into `elements`.
 */
const connectedComponents = (elements: readonly ExcalidrawElement[]): number[][] => {
  const indexById = new Map(elements.map((element, index) => [element.id, index]));
  const parents = elements.map((_, index) => index);

  const find = (index: number): number => {
    let root = index;
    while (parents[root] !== root) {
      parents[root] = parents[parents[root]];
      root = parents[root];
    }
    return root;
  };

  const join = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parents[rootB] = rootA;
    }
  };

  // A shared key (batch id, group id) connects every element carrying it.
  const firstWithKey = new Map<string, number>();
  const share = (index: number, key: string) => {
    const existing = firstWithKey.get(key);
    if (existing === undefined) {
      firstWithKey.set(key, index);
      return;
    }
    join(existing, index);
  };

  elements.forEach((element, index) => {
    const batchId = batchIdOf(element);
    if (batchId) {
      share(index, `batch:${batchId}`);
    }
    for (const groupId of groupIdsOf(element)) {
      share(index, `group:${groupId}`);
    }

    const containerId = containerIdOf(element);
    const containerIndex = containerId ? indexById.get(containerId) : undefined;
    if (containerIndex !== undefined) {
      join(index, containerIndex);
    }
    for (const boundId of bindingsOf(element)) {
      const boundIndex = indexById.get(boundId);
      if (boundIndex !== undefined) {
        join(index, boundIndex);
      }
    }
  });

  const components = new Map<number, number[]>();
  elements.forEach((_, index) => {
    const root = find(index);
    const component = components.get(root);
    if (component) {
      component.push(index);
    } else {
      components.set(root, [index]);
    }
  });
  return [...components.values()];
};

/**
 * Boxes of one component that must stay split, because a placement is anchored
 * to an element inside it. Only a bound label still travels with its container.
 */
const splitComponentBoxes = (
  elements: readonly ExcalidrawElement[],
  component: readonly number[],
): BBox[] => {
  const idsInComponent = new Set(component.map((index) => elements[index].id));
  const groups = new Map<string, BBox[]>();

  for (const index of component) {
    const element = elements[index];
    const containerId = containerIdOf(element);
    const key = containerId && idsInComponent.has(containerId) ? containerId : element.id;
    const group = groups.get(key);
    if (group) {
      group.push(toBBox(element));
    } else {
      groups.set(key, [toBBox(element)]);
    }
  }

  return [...groups.values()].map(unionBBox);
};

/**
 * Bounding boxes of everything that is actually on the page, one box per
 * connected group. A diagram, a table or any other batch is thus one block: new
 * content is placed beside it, never in the hollow spaces inside it.
 *
 * With `ungroupedElementId` the component holding that element stays split, so a
 * placement anchored to one element of a batch is still measured against that
 * element instead of against the whole batch.
 */
export const sceneBoxes = (
  elements: readonly ExcalidrawElement[],
  ungroupedElementId?: string,
): BBox[] => {
  const live = elements.filter((el) => !el.isDeleted && el.id !== A4_BOUNDARY_GUIDE_ID);
  const components = connectedComponents(live);
  const ungroupedComponent = ungroupedElementId
    ? (components.find((component) =>
        component.some((index) => live[index].id === ungroupedElementId),
      ) ?? null)
    : null;

  const boxes: BBox[] = [];
  for (const component of components) {
    if (component === ungroupedComponent) {
      boxes.push(...splitComponentBoxes(live, component));
      continue;
    }
    boxes.push(unionBBox(component.map((index) => toBBox(live[index]))));
  }
  return boxes;
};

const overlaps = (a: BBox, b: BBox, gap = BLOCK_GAP) =>
  a.x < b.x + b.width + gap &&
  a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap &&
  a.y + a.height + gap > b.y;

/** Two boxes covering the same area: the anchor is already in the scene list. */
const sameBox = (a: BBox, b: BBox) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

/** Collision search ignores the anchor a block is placed relative to. */
const withoutAnchor = (boxes: readonly BBox[], anchor?: BBox): readonly BBox[] =>
  anchor ? boxes.filter((box) => !sameBox(box, anchor)) : boxes;

/**
 * Pushes a candidate down until nothing overlaps it, so repeated placements
 * (twice below the same anchor, twice on the page centre) never stack. With a
 * `maxX` it first tries the space right of the blocking box, because a model
 * that guessed the same free spot twice means "next to it", not "below it".
 */
export const avoidCollisions = (
  boxes: readonly BBox[],
  start: { x: number; y: number },
  size: Size,
  maxX?: number,
): { x: number; y: number } => {
  let { x, y } = start;

  for (let guard = 0; guard < 500; guard++) {
    const candidate = { x, y, width: size.width, height: size.height };
    const blocking = boxes.find((box) => overlaps(candidate, box));
    if (!blocking) {
      return { x, y };
    }

    if (maxX !== undefined) {
      const besideX = round(blocking.x + blocking.width + BLOCK_GAP);
      const beside = { x: besideX, y, width: size.width, height: size.height };
      if (besideX + size.width <= maxX && !boxes.some((box) => overlaps(beside, box))) {
        return { x: besideX, y };
      }
    }

    y = round(blocking.y + blocking.height + BLOCK_GAP);
  }

  return { x, y };
};

const uniqueSorted = (values: readonly number[]): number[] =>
  [...new Set(values)].sort((a, b) => a - b);

/**
 * First free spot of `size` in the frame, scanned row by row: the horizontal
 * space left of and beside existing content is used before stacking further
 * down, so a short gap on the right never gets skipped.
 */
export const nextFreeSlot = (
  boxes: readonly BBox[],
  frame: BBox,
  size: Size,
): { x: number; y: number } => {
  const minX = minFrameX(frame);
  const maxX = maxFrameX(frame);
  const minY = minFrameY(frame);

  if (size.width <= maxX - minX) {
    const ys = uniqueSorted(
      [
        minY,
        ...boxes.flatMap((box) => [round(box.y), round(box.y + box.height + BLOCK_GAP)]),
      ].filter((y) => y >= minY),
    );
    const xs = uniqueSorted(
      [
        minX,
        ...boxes.flatMap((box) => [round(box.x), round(box.x + box.width + BLOCK_GAP)]),
      ].filter((x) => x >= minX && x + size.width <= maxX),
    );

    for (const y of ys) {
      for (const x of xs) {
        const candidate = { x, y, width: size.width, height: size.height };
        if (!boxes.some((box) => overlaps(candidate, box))) {
          return { x, y };
        }
      }
    }
  }

  // Too wide for the free space, or no gap large enough: keep stacking down.
  return {
    x: minX,
    y: Math.max(minY, ...boxes.map((box) => round(box.y + box.height + BLOCK_GAP))),
  };
};

/** The right column is an offset inside the frame, never absolute scene x. */
export const rightColumnX = (frame: BBox): number =>
  round(frame.x + Math.max(FRAME_PADDING, Math.min(RIGHT_COLUMN_X, frame.width / 2)));

/** Free slot in the right column. Kept for callers that still column-place. */
export const rightColumnSlot = (
  boxes: readonly BBox[],
  frame: BBox,
  size: Size,
): { x: number; y: number } => {
  const x = rightColumnX(frame);
  const band = { x, width: size.width };

  let y = round(frame.y + FRAME_PADDING);
  for (const box of boxes) {
    const sharesBand =
      box.x < band.x + band.width + BLOCK_GAP && box.x + box.width + BLOCK_GAP > band.x;
    if (sharesBand) {
      y = Math.max(y, round(box.y + box.height + BLOCK_GAP));
    }
  }

  return avoidCollisions(boxes, { x, y }, size);
};

export const belowBox = (anchor: BBox): { x: number; y: number } => ({
  x: round(anchor.x),
  y: round(anchor.y + anchor.height + BLOCK_GAP),
});

export const rightOfBox = (anchor: BBox): { x: number; y: number } => ({
  x: round(anchor.x + anchor.width + BLOCK_GAP),
  y: round(anchor.y),
});

export const leftOfBox = (anchor: BBox, size: Size): { x: number; y: number } => ({
  x: round(anchor.x - size.width - BLOCK_GAP),
  y: round(anchor.y),
});

export const aboveBox = (anchor: BBox, size: Size): { x: number; y: number } => ({
  x: round(anchor.x),
  y: round(anchor.y - size.height - BLOCK_GAP),
});

/** Centred inside the anchor: a sun drawn in a participant's circle belongs there. */
export const insideBox = (anchor: BBox, size: Size): { x: number; y: number } => ({
  x: round(anchor.x + (anchor.width - size.width) / 2),
  y: round(anchor.y + (anchor.height - size.height) / 2),
});

/**
 * Shrinks `size` proportionally so it always fits inside the anchor with
 * padding, keeping the aspect ratio of the drawing.
 */
export const fitInsideAnchor = (size: Size, anchor: BBox, padding = INSIDE_PADDING): Size => {
  const maxWidth = Math.max(MIN_FIT_SIZE, round(anchor.width - padding * 2));
  const maxHeight = Math.max(MIN_FIT_SIZE, round(anchor.height - padding * 2));
  if (size.width <= maxWidth && size.height <= maxHeight) {
    return size;
  }

  const ratio = Math.min(maxWidth / Math.max(size.width, 1), maxHeight / Math.max(size.height, 1));
  return {
    width: Math.max(MIN_FIT_SIZE, round(size.width * ratio)),
    height: Math.max(MIN_FIT_SIZE, round(size.height * ratio)),
  };
};

export const centeredInFrame = (frame: BBox, size: Size): { x: number; y: number } => ({
  x: round(frame.x + (frame.width - size.width) / 2),
  y: round(frame.y + (frame.height - size.height) / 2),
});

export const LAYOUT_MODES = [
  'free_space',
  'inside_element',
  'below_element',
  'above_element',
  'right_of_element',
  'left_of_element',
  'page_center',
] as const;

export type LayoutMode = (typeof LAYOUT_MODES)[number];

/** Layouts that only make sense with an anchor element. */
export const ANCHORED_LAYOUTS: readonly LayoutMode[] = [
  'inside_element',
  'below_element',
  'above_element',
  'right_of_element',
  'left_of_element',
];

/** Tool arguments are untrusted: anything unknown degrades to free space. */
export const readLayout = (raw: unknown): LayoutMode =>
  (LAYOUT_MODES as readonly string[]).includes(String(raw)) ? (raw as LayoutMode) : 'free_space';

/**
 * The element a placement is anchored to, or `undefined`. Free space ignores the
 * anchor entirely, so the page is then measured with whole batches merged.
 */
export const anchoredElementId = (layout: LayoutMode, rawId?: unknown): string | undefined => {
  if (!ANCHORED_LAYOUTS.includes(layout)) {
    return undefined;
  }
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  return id || undefined;
};

/**
 * Resolve where a new block goes. Unknown anchors degrade to free space instead
 * of failing: a misplaced block is recoverable, a failed tool call is not.
 * Every returned position stays inside the A4 width and the three-page height.
 */
export const resolvePlacement = (
  boxes: readonly BBox[],
  frame: BBox,
  size: Size,
  layout: LayoutMode = 'free_space',
  anchor?: BBox,
): { x: number; y: number } => {
  const freeBoxes = withoutAnchor(boxes, anchor);

  if (layout === 'inside_element' && anchor) {
    // An intentional overlap: the block belongs inside the anchor, so no
    // collision search may shove it out of the circle it was drawn for.
    return clampToA4Bounds(insideBox(anchor, size), size, frame);
  }
  if (layout === 'above_element' && anchor) {
    const start = aboveBox(anchor, size);
    const aboveFits = start.y >= minFrameY(frame);
    return clampToA4Bounds(
      avoidCollisions(freeBoxes, aboveFits ? start : belowBox(anchor), size),
      size,
      frame,
    );
  }
  if (layout === 'left_of_element' && anchor) {
    const start = leftOfBox(anchor, size);
    const leftFits = start.x >= minFrameX(frame);
    const fallback =
      rightOfBox(anchor).x + size.width <= maxFrameX(frame) ? rightOfBox(anchor) : belowBox(anchor);
    return clampToA4Bounds(
      avoidCollisions(freeBoxes, leftFits ? start : fallback, size),
      size,
      frame,
    );
  }
  if ((layout === 'below_element' || layout === 'right_of_element') && anchor) {
    // Placing beside the anchor must not push the block over the A4 right edge.
    const sideBySide = layout === 'right_of_element';
    const start =
      sideBySide && rightOfBox(anchor).x + size.width <= maxFrameX(frame)
        ? rightOfBox(anchor)
        : belowBox(anchor);
    return clampToA4Bounds(avoidCollisions(freeBoxes, start, size), size, frame);
  }
  if (layout === 'page_center') {
    return clampToA4Bounds(avoidCollisions(boxes, centeredInFrame(frame, size), size), size, frame);
  }

  // Free space fills the page the participant is looking at, horizontally first:
  // the free space right of existing content is used before stacking down.
  return clampToA4Bounds(nextFreeSlot(boxes, frame, size), size, frame);
};

/** Slack around the frame before a guessed coordinate is simply wrong. */
const GUESS_SLACK_X = 200;
const GUESS_SLACK_BELOW = 800;

const inFrameNeighbourhood = (frame: BBox, x: number, y: number): boolean =>
  x >= frame.x - GUESS_SLACK_X &&
  x <= frame.x + frame.width + GUESS_SLACK_X &&
  y >= frame.y - GUESS_SLACK_X &&
  y <= frame.y + frame.height + GUESS_SLACK_BELOW;

/** The model pointed inside a bigger element (a sun in a circle), not at a free spot. */
const isInsideContainer = (box: BBox, size: Size, pos: { x: number; y: number }): boolean => {
  if (box.width <= size.width || box.height <= size.height) {
    return false;
  }
  const centerX = pos.x + size.width / 2;
  const centerY = pos.y + size.height / 2;
  return (
    centerX > box.x &&
    centerX < box.x + box.width &&
    centerY > box.y &&
    centerY < box.y + box.height
  );
};

/**
 * Honours model-supplied coordinates only when they are plausible for this
 * board, and never lets them overwrite existing elements — except inside a
 * bigger element, where that overlap is exactly what was asked for.
 */
export const resolveExplicitOrFreePlacement = (
  boxes: readonly BBox[],
  frame: BBox,
  size: Size,
  rawX?: unknown,
  rawY?: unknown,
  layout: LayoutMode = 'free_space',
  anchor?: BBox | null,
): { x: number; y: number } => {
  if (anchor && layout !== 'free_space') {
    return resolvePlacement(boxes, frame, size, layout, anchor);
  }

  const x = Number(rawX);
  const y = Number(rawY);
  if (Number.isFinite(x) && Number.isFinite(y) && inFrameNeighbourhood(frame, x, y)) {
    const topLeft = { x: round(x), y: round(y) };
    if (boxes.some((box) => isInsideContainer(box, size, topLeft))) {
      return clampToA4Bounds(topLeft, size, frame);
    }
    return clampToA4Bounds(avoidCollisions(boxes, topLeft, size, maxFrameX(frame)), size, frame);
  }

  return resolvePlacement(boxes, frame, size, layout, anchor ?? undefined);
};

/** Bounding box of the element a placement is anchored to, when it exists. */
export const findAnchorBox = (
  elements: readonly ExcalidrawElement[],
  rawId?: unknown,
): BBox | null => {
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (!id) {
    return null;
  }
  const anchor = elements.find((element) => element.id === id && !element.isDeleted);
  return anchor ? toBBox(anchor) : null;
};

/** Shrinks `size` only when the block has to sit inside its anchor. */
export const fitInside = (size: Size, layout: LayoutMode, anchor: BBox | null): Size =>
  layout === 'inside_element' && anchor ? fitInsideAnchor(size, anchor) : size;
