import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { BinaryFileData } from '@excalidraw/excalidraw/types';

import {
  AGENT_FONT_FAMILY,
  agentCustomData,
  agentElementId,
  asCustomData,
  commitAgentElements,
  drawnResult,
  ensureBoardOpen,
  formatWhiteboardText,
  invalid,
  measureText,
  registerAgentImageFiles,
  toExcalidrawElements,
  type BoardContext,
} from '../agentElements';
import {
  anchoredElementId,
  findAnchorBox,
  maxA4ContentWidth,
  readLayout,
  resolveExplicitOrFreePlacement,
  sceneBoxes,
  toBBox,
  unionBBox,
  type BBox,
  type LayoutMode,
} from '../layoutEngine';

const TOOL_NAME = 'whiteboard_draw_diagram';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 72;
/** A node grows with its label, up to the width a whole column may take. */
const MAX_NODE_WIDTH = 360;
const NODE_FONT_SIZE = 18;
const EDGE_FONT_SIZE = 16;
/** Room around a node label: bound text keeps 5px each side, plus the border. */
const NODE_TEXT_MARGIN = 32;
const COLUMN_GAP = 60;
const ROW_GAP = 70;

type NodeShape = 'rectangle' | 'ellipse' | 'diamond';

export type DiagramNode = { id: string; label: string; shape: NodeShape };
export type DiagramEdge = { from: string; to: string; label?: string };
export type Diagram = { nodes: DiagramNode[]; edges: DiagramEdge[]; direction: 'TD' | 'LR' };

const NODE_PATTERNS: { pattern: RegExp; shape: NodeShape }[] = [
  { pattern: /^([\w.-]+)\(\((.*)\)\)$/, shape: 'ellipse' },
  { pattern: /^([\w.-]+)\[(.*)\]$/, shape: 'rectangle' },
  { pattern: /^([\w.-]+)\((.*)\)$/, shape: 'rectangle' },
  { pattern: /^([\w.-]+)\{(.*)\}$/, shape: 'diamond' },
  { pattern: /^([\w.-]+)$/, shape: 'rectangle' },
];

/** A label reaches the board as plain text, so LaTeX is flattened first. */
const cleanLabel = (value: string): string =>
  formatWhiteboardText(value.replace(/^["']|["']$/g, '').trim());

const parseNodeToken = (raw: string): { node: DiagramNode } | null => {
  const text = raw.trim();
  if (!text) {
    return null;
  }
  for (const { pattern, shape } of NODE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const id = match[1];
      return { node: { id, label: cleanLabel(match[2] ?? id) || id, shape } };
    }
  }
  return null;
};

const SKIPPED_LINE =
  /^\s*(%%|subgraph\b|end\b|style\b|classDef\b|class\b|linkStyle\b|click\b|direction\b)/i;

/**
 * Minimal Mermaid `graph`/`flowchart` reader: node declarations, chains and
 * labeled edges. Anything it does not understand is skipped rather than
 * rejected, so a slightly off diagram still renders.
 */
export const parseMermaidDiagram = (mermaid: string): Diagram => {
  const nodes = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];
  let direction: 'TD' | 'LR' = 'TD';

  const register = (raw: string): string | null => {
    const parsed = parseNodeToken(raw);
    if (!parsed) {
      return null;
    }
    const existing = nodes.get(parsed.node.id);
    // A later declaration may carry the real label (e.g. `A --> B[Start]`).
    if (!existing || (existing.label === existing.id && parsed.node.label !== parsed.node.id)) {
      nodes.set(parsed.node.id, parsed.node);
    }
    return parsed.node.id;
  };

  for (const line of mermaid.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (/^(graph|flowchart)\b/i.test(trimmed)) {
      direction = /\b(LR|RL)\b/i.test(trimmed) ? 'LR' : 'TD';
      continue;
    }
    if (SKIPPED_LINE.test(trimmed)) {
      continue;
    }

    const parts = trimmed.split(/\s*(-{2,3}>|==>|-\.->|<--|--)\s*/);
    if (parts.length === 1) {
      register(trimmed);
      continue;
    }

    for (let i = 0; i + 1 < parts.length; i += 2) {
      const left = parts[i];
      const right = parts[i + 2];
      if (right === undefined) {
        break;
      }

      let label: string | undefined;
      let rightToken = right;
      const labeled = /^\|([^|]*)\|(.*)$/.exec(right.trim());
      if (labeled) {
        label = cleanLabel(labeled[1]) || undefined;
        rightToken = labeled[2];
      }

      const from = register(left);
      const to = register(rightToken);
      if (from && to) {
        edges.push({ from, to, ...(label ? { label } : {}) });
      }
    }
  }

  return { nodes: [...nodes.values()], edges, direction };
};

/** Models often wrap the markup in a markdown fence; the parser wants it raw. */
const FENCED_MERMAID = /^```[a-zA-Z]*\s*\n?([\s\S]*?)```$/;

const stripFences = (value: string): string => {
  const fenced = FENCED_MERMAID.exec(value);
  // Only the fence goes: `formatWhiteboardText` would rewrite Mermaid node ids
  // too. Labels are flattened where they are read (`cleanLabel`, `formatSkeletons`).
  return (fenced ? fenced[1] : value).trim();
};

/** Depth of each node from the roots (longest path, cycle-safe). */
const rankNodes = (diagram: Diagram): Map<string, number> => {
  const ranks = new Map<string, number>(diagram.nodes.map((node) => [node.id, 0]));

  // Longest-path relaxation, bounded by the node count so a cycle cannot spin.
  for (let pass = 0; pass < diagram.nodes.length; pass++) {
    let changed = false;
    for (const edge of diagram.edges) {
      const fromRank = ranks.get(edge.from) ?? 0;
      const next = fromRank + 1;
      if (next > (ranks.get(edge.to) ?? 0) && next < diagram.nodes.length) {
        ranks.set(edge.to, next);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }

  return ranks;
};

const readScale = (value: unknown): number => {
  const scale = Number(value);
  return Number.isFinite(scale) && scale >= 0.3 && scale <= 2 ? scale : 1;
};

/**
 * A diagram wider than the A4 content width is scaled down, so even a wide
 * `flowchart LR` or `sequenceDiagram` never crosses the guide's right edge.
 */
const fitToA4Width = (scale: number, scaledWidth: number, frame: BBox): number => {
  const maxWidth = maxA4ContentWidth(frame);
  return scaledWidth > maxWidth ? scale * (maxWidth / scaledWidth) : scale;
};

/** Unscaled width the built-in flowchart layout needs at scale 1. */
const flowchartUnitWidth = (
  direction: Diagram['direction'],
  maxPerRank: number,
  maxRank: number,
  nodeWidth: number,
): number =>
  direction === 'TD'
    ? maxPerRank * nodeWidth + Math.max(maxPerRank - 1, 0) * COLUMN_GAP
    : (maxRank + 1) * nodeWidth + maxRank * COLUMN_GAP;

/** Lines a node label needs when it wraps inside the node. */
const labelLines = (label: string, fontSize: number, width: number): number =>
  label
    .split('\n')
    .reduce(
      (sum, line) =>
        sum + Math.max(1, Math.ceil(measureText(line, fontSize).width / Math.max(40, width))),
      0,
    );

/**
 * Node size at scale 1, measured from the labels: Excalidraw wraps a bound label
 * inside its container, so a wide label needs a wider node and a long one a
 * taller node. Otherwise the node would grow after the arrows were routed.
 */
const baseNodeSize = (nodes: readonly DiagramNode[]): { width: number; height: number } => {
  const widest = Math.max(...nodes.map((node) => measureText(node.label, NODE_FONT_SIZE).width));
  const width = Math.min(
    MAX_NODE_WIDTH,
    Math.max(NODE_WIDTH, Math.round(widest) + NODE_TEXT_MARGIN),
  );
  const lines = Math.max(
    ...nodes.map((node) => labelLines(node.label, NODE_FONT_SIZE, width - NODE_TEXT_MARGIN)),
  );
  return {
    width,
    height: Math.max(NODE_HEIGHT, Math.round(lines * NODE_FONT_SIZE * 1.35) + NODE_TEXT_MARGIN),
  };
};

/** Labels stay legible when a diagram is scaled down, so they shrink with it. */
const scaledFontSize = (base: number, scale: number): number =>
  Math.max(12, Math.round(base * scale));

/**
 * Mermaid passes its labels straight through, LaTeX included: text and bound
 * labels are normalized before the skeletons become Excalidraw elements.
 */
const formatSkeletons = (skeletons: readonly unknown[]): unknown[] =>
  skeletons.map((skeleton) => {
    if (!skeleton || typeof skeleton !== 'object') {
      return skeleton;
    }
    const record = skeleton as Record<string, unknown>;
    const label = record.label as { text?: unknown } | undefined;
    const text = typeof record.text === 'string' ? formatWhiteboardText(record.text) : undefined;
    const labelText =
      typeof label?.text === 'string' ? formatWhiteboardText(label.text) : undefined;
    if (text === undefined && labelText === undefined) {
      return skeleton;
    }
    return {
      ...record,
      ...(text !== undefined ? { text, originalText: text } : {}),
      ...(labelText !== undefined ? { label: { ...label, text: labelText } } : {}),
    };
  });

type NativeDiagram = { elements: ExcalidrawElement[]; files: BinaryFileData[] } | { error: string };

/**
 * Real Mermaid rendering through `@excalidraw/mermaid-to-excalidraw`: every
 * diagram type it supports becomes native shapes, bound labels and arrows, and
 * the types it can only draw as a picture (gantt, quadrant, timeline, mindmap)
 * become an image element.
 *
 * The module is loaded on demand (it is only needed when a diagram is drawn)
 * and it measures text with DOM APIs, so any environment failure falls back to
 * the built-in flowchart layout below.
 */
const parseWithMermaidLibrary = async (mermaid: string): Promise<NativeDiagram> => {
  try {
    const { parseMermaidToExcalidraw } = await import('@excalidraw/mermaid-to-excalidraw');
    const { elements: skeletons, files } = await parseMermaidToExcalidraw(mermaid);
    if (!skeletons || skeletons.length === 0) {
      return { error: 'the Mermaid markup produced no shapes' };
    }

    const imageFiles = Object.values(files ?? {}).filter((file): file is BinaryFileData =>
      Boolean(file?.dataURL),
    );

    const elements = attachImageFiles(
      await toExcalidrawElements(formatSkeletons(skeletons), TOOL_NAME),
      files,
    );
    return elements.length > 0
      ? { elements, files: imageFiles }
      : { error: 'the Mermaid markup produced no shapes' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
};

/**
 * Copies each image's binary data into its element (`customData.fileUrl`), so
 * peers load the picture straight from the element instead of needing the file
 * Excalidraw only holds in this device's memory.
 */
const attachImageFiles = (
  elements: ExcalidrawElement[],
  files?: Record<string, { dataURL?: string } | undefined>,
): ExcalidrawElement[] => {
  if (!files) {
    return elements;
  }
  return elements.map((element) => {
    const image = element.type === 'image' ? files[element.fileId ?? ''] : undefined;
    if (!image?.dataURL) {
      return element;
    }
    return {
      ...element,
      customData: asCustomData({
        ...(element.customData as Record<string, unknown> | undefined),
        fileUrl: image.dataURL,
        isOfficeFile: false,
      }),
    } as ExcalidrawElement;
  });
};

/**
 * Moves (and optionally scales) converted elements into the target origin,
 * measured from the diagram's own bounding box.
 */
const positionDiagram = (
  elements: readonly ExcalidrawElement[],
  scale: number,
  origin: { x: number; y: number },
): ExcalidrawElement[] => {
  const raw = unionBBox(elements.map(toBBox));
  const dx = origin.x - raw.x;
  const dy = origin.y - raw.y;

  const mapX = (value: number) => Math.round(raw.x + (value - raw.x) * scale + dx);
  const mapY = (value: number) => Math.round(raw.y + (value - raw.y) * scale + dy);
  const mapSize = (value: number) => Math.round(Math.abs(value) * scale) * Math.sign(value || 1);

  if (scale === 1) {
    return elements.map((element) => ({
      ...element,
      x: mapX(element.x),
      y: mapY(element.y),
    }));
  }

  return elements.map((element) => {
    const points = (element as { points?: readonly (readonly number[])[] }).points;
    const fontSize = (element as { fontSize?: unknown }).fontSize;
    return {
      ...element,
      x: mapX(element.x),
      y: mapY(element.y),
      width: mapSize(element.width),
      height: mapSize(element.height),
      // Text has to shrink with its container, or it is clipped inside it.
      ...(typeof fontSize === 'number'
        ? { fontSize: Math.max(10, Math.round(fontSize * scale)) }
        : {}),
      ...(points
        ? { points: points.map(([x, y]) => [Math.round(x * scale), Math.round(y * scale)]) }
        : {}),
    } as ExcalidrawElement;
  });
};

/** Falls back to the built-in flowchart layout for the markup Mermaid rejects. */
const buildFlowchart = async (
  diagram: Diagram,
  board: BoardContext,
  requestedScale: number,
  rawX: unknown,
  rawY: unknown,
  layout: LayoutMode,
  anchor: BBox | null,
  anchorId: string | undefined,
): Promise<ExcalidrawElement[]> => {
  const ranks = rankNodes(diagram);
  const perRank = new Map<number, string[]>();
  for (const node of diagram.nodes) {
    const rank = ranks.get(node.id) ?? 0;
    perRank.set(rank, [...(perRank.get(rank) ?? []), node.id]);
  }

  const maxPerRank = Math.max(...[...perRank.values()].map((ids) => ids.length));
  const maxRank = Math.max(...ranks.values());
  // The node size comes from the labels, before anything is placed: a node that
  // grows later would tear the arrows apart.
  const base = baseNodeSize(diagram.nodes);
  const scale = fitToA4Width(
    requestedScale,
    flowchartUnitWidth(diagram.direction, maxPerRank, maxRank, base.width) * requestedScale,
    board.frame,
  );
  // Floored, so a fitted diagram always lands inside the A4 content width.
  const nodeWidth = Math.floor(base.width * scale);
  const nodeHeight = Math.floor(base.height * scale);
  const columnGap = Math.round(COLUMN_GAP * scale);
  const rowGap = Math.round(ROW_GAP * scale);
  const totalWidth = Math.round(
    diagram.direction === 'TD'
      ? maxPerRank * nodeWidth + (maxPerRank - 1) * columnGap
      : (maxRank + 1) * nodeWidth + maxRank * columnGap,
  );
  const totalHeight = Math.round(
    diagram.direction === 'TD'
      ? (maxRank + 1) * nodeHeight + maxRank * rowGap
      : maxPerRank * nodeHeight + (maxPerRank - 1) * rowGap,
  );

  const origin = resolveExplicitOrFreePlacement(
    sceneBoxes(board.elements, anchorId),
    board.frame,
    { width: Math.max(totalWidth, nodeWidth), height: Math.max(totalHeight, nodeHeight) },
    rawX,
    rawY,
    layout,
    anchor,
    { centered: true },
  );

  // Position every node first: the arrows need both centres. Every rank is
  // centred on the diagram's own width, so a chain stays on the middle line and
  // a branching tree spreads symmetrically around it.
  const positions = new Map<string, { x: number; y: number }>();
  for (const [rank, ids] of perRank) {
    if (diagram.direction === 'TD') {
      const rankWidth = ids.length * nodeWidth + (ids.length - 1) * columnGap;
      const startX = origin.x + (totalWidth - rankWidth) / 2;
      ids.forEach((id, index) => {
        positions.set(id, {
          x: Math.round(startX + index * (nodeWidth + columnGap)),
          y: Math.round(origin.y + rank * (nodeHeight + rowGap)),
        });
      });
      continue;
    }

    const rankHeight = ids.length * nodeHeight + (ids.length - 1) * rowGap;
    const startY = origin.y + (totalHeight - rankHeight) / 2;
    ids.forEach((id, index) => {
      positions.set(id, {
        x: Math.round(origin.x + rank * (nodeWidth + columnGap)),
        y: Math.round(startY + index * (nodeHeight + rowGap)),
      });
    });
  }

  const data = asCustomData(agentCustomData(TOOL_NAME));
  const ids = new Map<string, string>();
  for (const node of diagram.nodes) {
    ids.set(node.id, agentElementId());
  }

  const skeletons: unknown[] = diagram.nodes.map((node) => {
    const position = positions.get(node.id) ?? origin;
    return {
      id: ids.get(node.id),
      type: node.shape,
      x: position.x,
      y: position.y,
      width: nodeWidth,
      height: nodeHeight,
      strokeColor: '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 2,
      label: {
        text: node.label,
        fontSize: scaledFontSize(NODE_FONT_SIZE, scale),
        fontFamily: AGENT_FONT_FAMILY,
      },
      customData: data,
    };
  });

  for (const edge of diagram.edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) {
      continue;
    }
    const startX = from.x + nodeWidth / 2;
    const startY = from.y + nodeHeight / 2;
    const endX = to.x + nodeWidth / 2;
    const endY = to.y + nodeHeight / 2;

    skeletons.push({
      id: agentElementId(),
      type: 'arrow',
      x: Math.round(startX),
      y: Math.round(startY),
      width: Math.round(endX - startX),
      height: Math.round(endY - startY),
      strokeColor: '#1e1e1e',
      strokeWidth: 2,
      start: { id: ids.get(edge.from) },
      end: { id: ids.get(edge.to) },
      ...(edge.label
        ? {
            label: {
              text: edge.label,
              fontSize: scaledFontSize(EDGE_FONT_SIZE, scale),
              fontFamily: AGENT_FONT_FAMILY,
            },
          }
        : {}),
      customData: data,
    });
  }

  return toExcalidrawElements(skeletons, TOOL_NAME);
};

/**
 * `whiteboard_draw_diagram`: Mermaid markup becomes native Excalidraw shapes,
 * bound arrows and labels, placed in free space.
 */
export const executeWhiteboardDrawDiagramTool = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const mermaid = typeof args.mermaid === 'string' ? stripFences(args.mermaid) : '';
  if (!mermaid) {
    return invalid('mermaid must be a non-empty Mermaid flowchart.');
  }

  const lookup = await ensureBoardOpen();
  if ('error' in lookup) {
    return invalid(lookup.error);
  }
  const context = lookup.board;
  const scale = readScale(args.scale);
  const layout = readLayout(args.layout);
  const anchorId = anchoredElementId(layout, args.anchor_element_id);
  const anchor = findAnchorBox(context.elements, args.anchor_element_id);

  const native = await parseWithMermaidLibrary(mermaid);
  if ('elements' in native) {
    const raw = unionBBox(native.elements.map(toBBox));
    const effectiveScale = fitToA4Width(scale, raw.width * scale, context.frame);
    const origin = resolveExplicitOrFreePlacement(
      sceneBoxes(context.elements, anchorId),
      context.frame,
      {
        width: Math.max(Math.round(raw.width * effectiveScale), NODE_WIDTH),
        height: Math.max(Math.round(raw.height * effectiveScale), NODE_HEIGHT),
      },
      args.x,
      args.y,
      layout,
      anchor,
      { centered: true },
    );
    const positioned = positionDiagram(native.elements, effectiveScale, origin);

    if (!commitAgentElements(context, positioned, { toolName: TOOL_NAME })) {
      return invalid('The whiteboard refused the write.');
    }
    // Diagram types rendered as a picture carry their bytes in the element, so
    // the image element has to be in the scene before its file is registered.
    await registerAgentImageFiles(context.api, native.files);
    return drawnResult(positioned);
  }

  const diagram = parseMermaidDiagram(mermaid);
  if (diagram.nodes.length === 0) {
    return invalid(
      `Mermaid syntax error: ${native.error}. Pass valid raw Mermaid syntax (e.g. flowchart TD, sequenceDiagram, classDiagram, stateDiagram-v2, or erDiagram).`,
    );
  }

  const elements = await buildFlowchart(
    diagram,
    context,
    scale,
    args.x,
    args.y,
    layout,
    anchor,
    anchorId,
  );
  if (!commitAgentElements(context, elements, { toolName: TOOL_NAME })) {
    return invalid('The whiteboard refused the write.');
  }

  return drawnResult(elements);
};
