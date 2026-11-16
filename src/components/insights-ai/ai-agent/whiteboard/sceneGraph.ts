import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import { A4_BOUNDARY_GUIDE_ID } from '../../../whiteboard/helpers/constants';
import { getBoardFrame, toBBox, type BBox } from './layoutEngine';

/** Hard cap on the number of elements one scene graph may describe. */
export const MAX_SCENE_GRAPH_ELEMENTS = 200;
const MAX_TEXT_LENGTH = 200;
/** Word spans per element: enough to point at a mistake, small enough to ship. */
const MAX_WORD_SPANS = 24;
const DEFAULT_FONT_SIZE = 20;
const CHAR_WIDTH_RATIO = 0.55;

/**
 * Canvas text is data, never instructions: anything shaped like an instruction
 * is still quoted, only flagged so the server can count it.
 */
const SUSPECT_INSTRUCTION = /^\s*(SYSTEM:|\[SYSTEM|###\s*instruction)/i;

export type SceneElementAuthor = 'agent' | 'participant';

/** Where a snapshot was taken: only what the participant sees, or the whole page. */
export type SceneScope = 'viewport' | 'full_canvas';

/**
 * One word of an element's text with the box it occupies on the canvas, so the
 * model can point at a specific mistake instead of guessing pixel offsets.
 */
export type SceneWordSpan = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  underline_y: number;
};

export type SceneGraphElement = {
  id: string;
  type: string;
  text: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  author: SceneElementAuthor;
  trust: 'agent' | 'untrusted_canvas_content';
  suspect_instruction?: boolean;
  stroke_count?: number;
  font_size?: number;
  stroke_color?: string;
  background_color?: string;
  words?: SceneWordSpan[];
  bound?: { start?: string; end?: string };
};

export type WhiteboardSceneGraph = {
  board: { file_id: string; page: number };
  viewport?: { x: number; y: number; width: number; height: number; zoom: number };
  scope?: SceneScope;
  page_bounds: BBox;
  counts: { total: number; participant: number; agent: number };
  truncated?: boolean;
  omitted?: number;
  elements: SceneGraphElement[];
};

export type WhiteboardScene = {
  graph: WhiteboardSceneGraph;
  participantElementIds: string[];
  agentElementIds: string[];
};

export type SceneViewport = { x: number; y: number; width: number; height: number; zoom: number };

const isAgentTagged = (element: ExcalidrawElement): boolean =>
  !!(element.customData as { ai_agent?: unknown } | undefined)?.ai_agent ||
  element.id.startsWith('ai_');

const containerIdOf = (element: ExcalidrawElement): string | null =>
  (element as { containerId?: string | null }).containerId ?? null;

/**
 * Agent-authored elements carry the tag; the id prefix is a cheap fallback and
 * the container decides for bound label text elements made by Excalidraw.
 */
export const isAgentElement = (
  element: ExcalidrawElement,
  byId?: ReadonlyMap<string, ExcalidrawElement>,
): boolean => {
  if (isAgentTagged(element)) {
    return true;
  }
  const containerId = containerIdOf(element);
  if (!containerId) {
    return false;
  }
  const container = byId?.get(containerId);
  return !!container && isAgentTagged(container);
};

/**
 * Bound label text is already reported as its container's `text`, so it must
 * not appear twice. Untagged standalone text stays a normal element.
 */
const isBoundLabel = (
  element: ExcalidrawElement,
  byId: ReadonlyMap<string, ExcalidrawElement>,
): boolean => {
  if (element.type !== 'text') {
    return false;
  }
  const containerId = containerIdOf(element);
  if (!containerId) {
    return false;
  }
  const container = byId.get(containerId);
  if (!container || container.isDeleted) {
    return false;
  }
  return !!container.boundElements?.some((bound) => bound.id === element.id);
};

const boundTextOf = (
  element: ExcalidrawElement,
  byId: ReadonlyMap<string, ExcalidrawElement>,
): string | null => {
  if (element.type === 'text') {
    return (element as { text?: string }).text ?? null;
  }
  const labelId = element.boundElements?.find((bound) => bound.type === 'text')?.id;
  if (!labelId) {
    return null;
  }
  const label = byId.get(labelId) as { text?: string } | undefined;
  return label?.text ?? null;
};

const clipText = (text: string | null): string | null => {
  if (text === null) {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > MAX_TEXT_LENGTH ? `${trimmed.slice(0, MAX_TEXT_LENGTH)}…` : trimmed;
};

type TextGeometry = BBox & { fontSize: number };

const fontSizeOf = (element: ExcalidrawElement): number =>
  (element as { fontSize?: number }).fontSize ?? DEFAULT_FONT_SIZE;

/** Rough text box, used only when Excalidraw has not measured the label yet. */
const estimateTextSize = (text: string, fontSize: number): { width: number; height: number } => {
  const lines = text.split('\n');
  const lineHeight = Math.max(fontSize, Math.round(fontSize * 1.25));
  return {
    width: Math.ceil(Math.max(...lines.map((line) => line.length)) * fontSize * CHAR_WIDTH_RATIO),
    height: lineHeight * lines.length,
  };
};

/**
 * The box the element's text occupies: its own geometry for a text element, the
 * bound label's geometry for a labelled shape.
 */
const textGeometryOf = (
  element: ExcalidrawElement,
  byId: ReadonlyMap<string, ExcalidrawElement>,
): TextGeometry | null => {
  if (element.type === 'text') {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      fontSize: fontSizeOf(element),
    };
  }

  const labelId = element.boundElements?.find((bound) => bound.type === 'text')?.id;
  const label = labelId ? byId.get(labelId) : undefined;
  if (!label) {
    return null;
  }

  if (label.width > 0 && label.height > 0) {
    return {
      x: label.x,
      y: label.y,
      width: label.width,
      height: label.height,
      fontSize: fontSizeOf(label),
    };
  }

  // An unmeasured label sits centred inside its container.
  const text = (label as { text?: string }).text ?? '';
  const measured = estimateTextSize(text, DEFAULT_FONT_SIZE);
  return {
    x: Math.round(element.x + (element.width - measured.width) / 2),
    y: Math.round(element.y + (element.height - measured.height) / 2),
    width: measured.width,
    height: measured.height,
    fontSize: DEFAULT_FONT_SIZE,
  };
};

/**
 * Splits the element's text into word boxes. Widths are derived from the text
 * box (Excalidraw re-wraps per line), which is exact enough to underline or box
 * a single word without shipping a glyph-per-glyph measurement.
 */
export const extractWordSpans = (
  element: ExcalidrawElement,
  byId: ReadonlyMap<string, ExcalidrawElement>,
): SceneWordSpan[] => {
  const geometry = textGeometryOf(element, byId);
  const text = boundTextOf(element, byId)?.trim();
  if (!geometry || !text) {
    return [];
  }

  const spans: SceneWordSpan[] = [];
  const lineHeight = Math.max(geometry.fontSize, Math.round(geometry.fontSize * 1.25));

  text.split('\n').forEach((line, lineIndex) => {
    if (spans.length >= MAX_WORD_SPANS) {
      return;
    }
    const lineY = Math.round(geometry.y + lineIndex * lineHeight);
    const charWidth =
      line.length > 0
        ? geometry.width / Math.max(line.length, 1)
        : geometry.fontSize * CHAR_WIDTH_RATIO;

    for (const match of line.matchAll(/(\S+)/g)) {
      if (spans.length >= MAX_WORD_SPANS) {
        return;
      }
      const word = match[1];
      spans.push({
        text: word,
        x: Math.round(geometry.x + (match.index ?? 0) * charWidth),
        y: lineY,
        width: Math.max(8, Math.round(word.length * charWidth)),
        height: Math.round(lineHeight),
        underline_y: Math.round(lineY + lineHeight + 2),
      });
    }
  });

  return spans;
};

/** Comparison key: case and surrounding punctuation never matter to the model. */
const wordKey = (value: string): string =>
  value
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[^\p{L}\p{N}]+$/u, '')
    .toLowerCase();

/**
 * Box of a word (or multi-word phrase) inside an element's text, so
 * `whiteboard_draw_shapes` can underline or circle exactly that word.
 */
export const findWordBoxInElement = (
  element: ExcalidrawElement,
  byId: ReadonlyMap<string, ExcalidrawElement>,
  targetText: string,
): BBox | null => {
  const wanted = targetText.trim().split(/\s+/).map(wordKey).filter(Boolean);
  if (wanted.length === 0) {
    return null;
  }

  const spans = extractWordSpans(element, byId);
  for (let start = 0; start + wanted.length <= spans.length; start++) {
    const run = spans.slice(start, start + wanted.length);
    if (!run.every((span, offset) => wordKey(span.text) === wanted[offset])) {
      continue;
    }
    const x = Math.min(...run.map((span) => span.x));
    const y = Math.min(...run.map((span) => span.y));
    const right = Math.max(...run.map((span) => span.x + span.width));
    const bottom = Math.max(...run.map((span) => span.y + span.height));
    return { x, y, width: right - x, height: bottom - y };
  }

  return null;
};

const summarize = (
  element: ExcalidrawElement,
  byId: ReadonlyMap<string, ExcalidrawElement>,
): SceneGraphElement => {
  const author: SceneElementAuthor = isAgentElement(element, byId) ? 'agent' : 'participant';
  const text = clipText(boundTextOf(element, byId));
  const summary: SceneGraphElement = {
    id: element.id,
    type: element.type,
    text,
    x: Math.round(element.x),
    y: Math.round(element.y),
    width: Math.round(element.width),
    height: Math.round(element.height),
    author,
    trust: author === 'agent' ? 'agent' : 'untrusted_canvas_content',
  };

  if (text && SUSPECT_INSTRUCTION.test(text)) {
    summary.suspect_instruction = true;
  }

  const fontSize = textGeometryOf(element, byId)?.fontSize;
  if (fontSize) {
    summary.font_size = fontSize;
  }

  const strokeColor = (element as { strokeColor?: string }).strokeColor;
  if (strokeColor && strokeColor !== 'transparent') {
    summary.stroke_color = strokeColor;
  }

  const backgroundColor = (element as { backgroundColor?: string }).backgroundColor;
  if (backgroundColor && backgroundColor !== 'transparent') {
    summary.background_color = backgroundColor;
  }

  if (text) {
    const words = extractWordSpans(element, byId);
    if (words.length > 0) {
      summary.words = words;
    }
  }

  const points = (element as { points?: unknown }).points;
  if (element.type === 'freedraw' && Array.isArray(points)) {
    // Never ship point arrays: one stroke can be thousands of coordinates.
    summary.stroke_count = points.length;
  }

  if (element.type === 'arrow' || element.type === 'line') {
    const linear = element as {
      startBinding?: { elementId: string } | null;
      endBinding?: { elementId: string } | null;
    };
    const start = linear.startBinding?.elementId;
    const end = linear.endBinding?.elementId;
    if (start || end) {
      summary.bound = { ...(start ? { start } : {}), ...(end ? { end } : {}) };
    }
  }

  return summary;
};

const intersects = (a: BBox, b: BBox): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

/**
 * Compact, coordinate-accurate description of a whiteboard page. The WebP
 * snapshot says *what* is on the board, this says *where* it is — the agent
 * needs both to point at and correct the participant's work.
 *
 * Participant work is kept preferentially when the page is truncated: it is the
 * material the agent has to react to. `scope: 'viewport'` narrows the report to
 * what is on screen; it falls back to the whole page when nothing intersects.
 */
export const buildWhiteboardSceneGraph = (
  elements: readonly ExcalidrawElement[],
  fileId: string,
  page: number,
  viewport?: SceneViewport,
  scope: SceneScope = 'full_canvas',
): WhiteboardScene => {
  const byId = new Map(elements.map((element) => [element.id, element]));
  const pageElements = elements.filter(
    (element) =>
      !element.isDeleted && element.id !== A4_BOUNDARY_GUIDE_ID && !isBoundLabel(element, byId),
  );

  const inViewport =
    scope === 'viewport' && viewport && viewport.width > 0 && viewport.height > 0
      ? pageElements.filter((element) => intersects(toBBox(element), viewport))
      : [];
  // A viewport that intersects nothing means it is scrolled off the content, so
  // the whole page is reported instead of a misleadingly empty result.
  const live = inViewport.length > 0 ? inViewport : pageElements;

  // Most recent first inside each author group, participants first.
  const ranked = [...live].sort((a, b) => {
    const aAgent = isAgentElement(a, byId);
    const bAgent = isAgentElement(b, byId);
    if (aAgent !== bAgent) {
      return aAgent ? 1 : -1;
    }
    return (b.updated ?? 0) - (a.updated ?? 0);
  });

  const kept = ranked.slice(0, MAX_SCENE_GRAPH_ELEMENTS);
  const omitted = live.length - kept.length;
  // Reading order for the model: top-to-bottom, left-to-right.
  const ordered = [...kept].sort((a, b) => a.y - b.y || a.x - b.x);

  const summaries = ordered.map((element) => summarize(element, byId));
  const participantElementIds = summaries
    .filter((element) => element.author === 'participant')
    .map((element) => element.id);
  const agentElementIds = summaries
    .filter((element) => element.author === 'agent')
    .map((element) => element.id);

  const graph: WhiteboardSceneGraph = {
    board: { file_id: fileId, page },
    ...(viewport ? { viewport } : {}),
    scope,
    page_bounds: getBoardFrame(elements),
    counts: {
      total: summaries.length,
      participant: participantElementIds.length,
      agent: agentElementIds.length,
    },
    ...(omitted > 0 ? { truncated: true, omitted } : {}),
    elements: summaries,
  };

  return { graph, participantElementIds, agentElementIds };
};
