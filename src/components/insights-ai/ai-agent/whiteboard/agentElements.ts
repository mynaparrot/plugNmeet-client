import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/element/transform';
import type { BinaryFileData, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

import { store } from '../../../../store';
import { aiAgentSelector } from '../../../../store/slices/aiAgentSlice';
import { getWhiteboardController, type WhiteboardController } from '../../../whiteboard/collab';
import { getWhiteboardExcalidrawAPI } from '../../../whiteboard/helpers/liveScene';
import { traceElementsWithLaser } from './agentLaser';
import { pushAgentAction } from './agentHistory';
import { ensureWhiteboardSurface, whiteboardEnabled } from './boardSession';
import {
  BLOCK_GAP,
  FRAME_PADDING,
  MAX_A4_PAGES,
  batchIdOf,
  findComponentElements,
  getBoardFrame,
  maxA4ContentWidth,
  sameBox,
  sceneBoxes,
  toBBox,
  unionBBox,
  type BBox,
  type LayoutMode,
} from './layoutEngine';
import { isAgentElement } from './sceneGraph';
import { beginAgentWhiteboardTool, endAgentWhiteboardTool } from './useVisionSync';

/** Palette names the tool schemas allow, mapped to Excalidraw colours. */
export const STROKE_COLORS: Record<string, string> = {
  black: '#1e1e1e',
  blue: '#1971c2',
  red: '#e03131',
  green: '#2f9e44',
  orange: '#f08c00',
  violet: '#6741d9',
};

export const FILL_COLORS: Record<string, string> = {
  transparent: 'transparent',
  white: '#ffffff',
  yellow: '#ffec99',
  green: '#b2f2bb',
  blue: '#a5d8ff',
  red: '#ffc9c9',
};

export const resolveStrokeColor = (name?: unknown): string =>
  STROKE_COLORS[String(name ?? 'black')] ?? STROKE_COLORS.black;

/**
 * Excalifont: Excalidraw's default hand-drawn font, so agent text looks like the
 * rest of the board instead of falling back to the narrower `sans-serif`.
 */
export const AGENT_FONT_FAMILY = 5;

/**
 * Colour for a mark or correction that sits on top of, or beside, a
 * participant's element. A mark in the participant's own colour is invisible
 * as feedback, so a missing or `black` choice becomes red and an exact match
 * becomes blue: the result is always different from the participant's colour.
 */
export const resolveContrastingStrokeColor = (
  requestedColorName: unknown,
  participantStrokeHex?: string | null,
): string => {
  const participant = participantStrokeHex?.trim().toLowerCase();
  if (!participant) {
    return resolveStrokeColor(requestedColorName);
  }

  const requested = String(requestedColorName ?? '')
    .trim()
    .toLowerCase();
  const color =
    !requested || requested === 'black' ? STROKE_COLORS.red : resolveStrokeColor(requested);
  if (color !== participant) {
    return color;
  }
  // Even blue can be the participant's colour, so fall back to red.
  return participant === STROKE_COLORS.blue ? STROKE_COLORS.red : STROKE_COLORS.blue;
};

export const resolveFillColor = (name?: unknown): string =>
  FILL_COLORS[String(name ?? 'transparent')] ?? 'transparent';

const randomSuffix = () => Math.random().toString(36).slice(2, 10);

/** Ids of agent-made elements are prefixed, so authorship survives any reload. */
export const agentElementId = (): string => `ai_${randomSuffix()}`;

const currentSessionId = (): string => aiAgentSelector(store.getState())?.sessionId ?? '';

/**
 * Authorship tag written into `customData` of every agent element. Everything
 * that belongs to one action shares a `batchId`, so the layout engine can treat
 * the whole action (a diagram, a table, a group) as a single block.
 */
export const agentCustomData = (toolName: string, batchId = agentElementId()) => ({
  ai_agent: {
    sessionId: currentSessionId(),
    toolName,
    batchId,
    createdAt: Date.now(),
  },
});

export const asCustomData = (value: Record<string, unknown>) => value as never;

type CustomData = Record<string, unknown> | undefined;

const customDataOf = (element: { customData?: unknown }): CustomData =>
  element.customData as CustomData;

const hasAgentTag = (data: unknown): boolean =>
  !!(data as { ai_agent?: unknown } | undefined)?.ai_agent;

/** The batch an element already belongs to, when it carries one. */
const agentBatchId = (data: unknown): string | null => {
  const batchId = (data as { ai_agent?: { batchId?: unknown } } | undefined)?.ai_agent?.batchId;
  return typeof batchId === 'string' && batchId ? batchId : null;
};

/**
 * Tags one element with the agent's `customData`, keeping whatever part of the
 * tag is already there. An element that carries no batch joins `batchId`.
 */
const withAgentData = (
  data: CustomData,
  toolName: string,
  batchId: string,
): Record<string, unknown> => {
  const current = (data as { ai_agent?: Record<string, unknown> } | undefined)?.ai_agent;
  if (!data || !current) {
    return { ...data, ...agentCustomData(toolName, batchId) };
  }
  if (agentBatchId(data)) {
    return data;
  }
  return { ...data, ai_agent: { ...current, batchId } };
};

const FONT_PRELOAD_TIMEOUT_MS = 300;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Excalidraw measures a text element once, at conversion time, with whatever
 * font faces are loaded at that moment. A measurement taken before the
 * hand-drawn webfont arrives bakes the narrower fallback width into the
 * element, and the webfont then paints past the element's offscreen canvas and
 * cuts the line off mid-character. Waiting for the faces, with a short cap so a
 * slow or blocked font request cannot stall a tool call, avoids that.
 */
const loadAgentFonts = async (): Promise<void> => {
  if (typeof document === 'undefined' || typeof document.fonts?.load !== 'function') {
    return;
  }
  try {
    await Promise.race([
      Promise.all([document.fonts.load('20px Excalifont'), document.fonts.load('20px Virgil')]),
      delay(FONT_PRELOAD_TIMEOUT_MS),
    ]);
  } catch {
    // Offline, or no font face set to load into: the width floor below keeps
    // the text box wide enough for what actually gets painted.
  }
};

type TextElementFields = {
  type: string;
  text: string;
  fontSize: number;
  textAlign?: string;
  containerId?: string | null;
};

/**
 * Excalidraw paints a text element into a canvas only `width + fontSize / 2`
 * wide, and its own `measureText` can come back narrower than the hand-drawn
 * font's glyphs. Left-aligned standalone text draws from the canvas origin, so
 * a wider box only adds room on the right and can never clip: keep the box at
 * least as large as the metrics the board was laid out with.
 *
 * Centred and right-aligned text are left alone (a wider box would move the
 * glyphs), as is bound text, whose container sizes and centres it and whose
 * canvas already carries 20px of padding.
 */
const floorTextSize = (element: ExcalidrawElement): ExcalidrawElement => {
  const text = element as unknown as TextElementFields;
  if (text.type !== 'text' || text.containerId) {
    return element;
  }
  if (text.textAlign === 'center' || text.textAlign === 'right') {
    return element;
  }
  const metrics = measureText(text.text, text.fontSize);
  if (metrics.width <= element.width && metrics.height <= element.height) {
    return element;
  }
  return {
    ...element,
    width: Math.max(element.width, metrics.width),
    height: Math.max(element.height, metrics.height),
  } as ExcalidrawElement;
};

/**
 * Builds real Excalidraw elements from shorthand skeletons. Loaded on demand so
 * importing the tool registry never drags the editor bundle into the page.
 *
 * A skeleton `label` becomes a separate bound text element with a fresh id and
 * no `customData`, so the batch tag is copied onto it here.
 */
export const toExcalidrawElements = async (
  skeletons: unknown[],
  toolName?: string,
): Promise<ExcalidrawElement[]> => {
  await loadAgentFonts();
  const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');
  const elements = convertToExcalidrawElements(skeletons as ExcalidrawElementSkeleton[], {
    regenerateIds: false,
  }) as unknown as ExcalidrawElement[];

  const batchData = skeletons
    .map((skeleton) => customDataOf(skeleton as { customData?: unknown }))
    .find(hasAgentTag);
  const fallback: CustomData = batchData ?? (toolName ? agentCustomData(toolName) : undefined);
  if (!fallback) {
    return elements.map(floorTextSize);
  }

  const byId = new Map(elements.map((element) => [element.id, element]));
  const tagged: ExcalidrawElement[] = [];
  for (const element of elements) {
    const existing = customDataOf(element);
    if (hasAgentTag(existing)) {
      tagged.push(element);
      continue;
    }
    const containerId = (element as { containerId?: string | null }).containerId;
    const container = containerId ? byId.get(containerId) : undefined;
    const containerData = container && customDataOf(container);
    const source = hasAgentTag(containerData) ? containerData! : fallback;
    tagged.push({
      ...element,
      customData: asCustomData({ ...existing, ...source }),
    } as ExcalidrawElement);
  }
  return tagged.map(floorTextSize);
};

/**
 * Fractional z-index after everything already on the page. Excalidraw compares
 * indices lexicographically, so appending a fraction keeps the order valid.
 */
export const nextSceneIndex = (elements: readonly ExcalidrawElement[]): string => {
  const indices = elements
    .map((element) => (element as { index?: string }).index)
    .filter((index): index is string => typeof index === 'string' && index.length > 0);
  if (indices.length === 0) {
    return 'a0';
  }
  return `${indices.sort()[indices.length - 1]}V`;
};

export type FreeDrawInput = {
  id: string;
  x: number;
  y: number;
  /** Points relative to (x, y). */
  points: [number, number][];
  strokeColor: string;
  strokeWidth: number;
  index: string;
  customData: never;
};

/**
 * Excalidraw has no freedraw skeleton, so a freedraw element is built field by
 * field from the sampled stroke.
 */
export const buildFreeDrawElement = (input: FreeDrawInput): ExcalidrawElement => {
  const xs = input.points.map(([x]) => x);
  const ys = input.points.map(([, y]) => y);
  const width = Math.round(Math.max(...xs) - Math.min(...xs));
  const height = Math.round(Math.max(...ys) - Math.min(...ys));
  const seed = Math.floor(Math.random() * 2 ** 31);

  return {
    id: input.id,
    type: 'freedraw',
    x: Math.round(input.x),
    y: Math.round(input.y),
    width: Math.max(1, width),
    height: Math.max(1, height),
    angle: 0,
    strokeColor: input.strokeColor,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: input.strokeWidth,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed,
    version: 1,
    versionNonce: seed,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    index: input.index,
    pressures: [],
    // Uniform width: simulated pressure thickens and thins a sampled stroke,
    // which reads as a wobbly line instead of a drawn one.
    simulatePressure: false,
    lastCommittedPoint: null,
    points: input.points,
    customData: input.customData,
  } as unknown as ExcalidrawElement;
};

// oxfmt-ignore
const LATEX_SYMBOLS: Record<string, string> = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π', Sigma: '∑', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', int: '∫', sum: '∑', prod: '∏', sqrt: '√', infty: '∞', partial: '∂', nabla: '∇', pm: '±', mp: '∓', times: '×', cdot: '·', div: '÷', neq: '≠', ne: '≠', leq: '≤', le: '≤', geq: '≥', ge: '≥', approx: '≈', equiv: '≡', sim: '∼', propto: '∝', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩', forall: '∀', exists: '∃', rightarrow: '→', to: '→', leftarrow: '←', Rightarrow: '⇒', Leftrightarrow: '⇔', iff: '⇔', det: 'det', sin: 'sin', cos: 'cos', tan: 'tan', log: 'log', ln: 'ln', lim: 'lim', max: 'max', min: 'min', left: '', right: '' };

// oxfmt-ignore
const SUPERSCRIPTS: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', b: 'ᵇ', n: 'ⁿ', i: 'ⁱ', x: 'ˣ', y: 'ʸ' };

// oxfmt-ignore
const SUBSCRIPTS: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ' };

/** Repeated until stable, so nested `\frac{...}{...}` and friends resolve. */
const replaceUntilStable = (
  text: string,
  pattern: RegExp,
  replacer: (match: string, ...groups: string[]) => string,
): string => {
  let out = text;
  for (let pass = 0; pass < 4; pass++) {
    const next = out.replace(pattern, replacer);
    if (next === out) {
      break;
    }
    out = next;
  }
  return out;
};

/** `$50`, `$1,20` and `$50 and $60` stay currency; only real formulas are unwrapped. */
const looksLikeMath = (inner: string): boolean => {
  const value = inner.trim();
  if (!value || /^[\d.,]/.test(value)) {
    return false;
  }
  return /[a-zA-Z\\]/.test(value);
};

/** Any real math marker: a delimiter, a script, or a LaTeX command. */
const MATH_INDICATORS = /[$\\^]|_[{\d]|\\[a-zA-Z]/;

/**
 * A bare `_x` that reads as a subscript: either a single-letter variable
 * (`x_1`, `a_n`) or the base of an operator (`\int_a`, `\sum_i`, `lim_x`).
 * A preceding `user` or `step` fails the lookbehind, so identifiers such as
 * `user_id` or `step_1` are left exactly as written.
 */
const BARE_SUBSCRIPT = /(?<![A-Za-z0-9_])((?:lim|[A-Za-z∫∑∏]))_([0-9a-zA-Z])(?![A-Za-z0-9_])/g;

const subscriptOrSuperscript = (
  text: string,
  marker: '^' | '_',
  table: Record<string, string>,
  hasMathIndicators: boolean,
): string => {
  const map = (inner: string): string | null => {
    const chars = [...inner.trim()];
    const mapped = chars.map((char) => table[char]);
    return chars.length > 0 && mapped.every((char) => char !== undefined) ? mapped.join('') : null;
  };

  // Single characters first, and never the parentheses of an already formatted
  // `^(...)`: formatting runs more than once, so it has to stay idempotent.
  // `^2`/`^n` are always powers, while a bare `_x` only becomes a subscript in
  // a formula and next to a symbol or a lone variable. Otherwise `snake_case`
  // names would be mangled (`user_id` -> `userᵢd`, `room_1` -> `room₁`).
  const single =
    marker === '^'
      ? text.replace(
          new RegExp(`\\^([A-Za-z0-9+\\-=])(?![A-Za-z0-9_])`, 'g'),
          (match: string, char: string) => table[char] ?? match,
        )
      : hasMathIndicators
        ? text.replace(BARE_SUBSCRIPT, (match: string, base: string, char: string) => {
            const mapped = table[char];
            return mapped === undefined ? match : `${base}${mapped}`;
          })
        : text;

  const braced = new RegExp(`\\${marker}\\s*\\{([^{}]*)\\}`, 'g');
  return single.replace(braced, (_match, inner: string) => {
    const value = String(inner).trim();
    return map(value) ?? `${marker}(${value})`;
  });
};

/**
 * Excalidraw renders text, not LaTeX: `$$...$$`, `\int`, `\pi` and friends are
 * turned into the Unicode the canvas can actually draw.
 */
export const formatWhiteboardText = (raw: string): string => {
  if (!raw || !/[$\\^_]/.test(raw)) {
    return raw;
  }

  let text = raw;
  const delimiters = [/\$\$([\s\S]*?)\$\$/g, /\\\[([\s\S]*?)\\\]/g, /\\\(([\s\S]*?)\\\)/g];
  for (const pattern of delimiters) {
    text = text.replace(pattern, (_match, inner: string) => String(inner).trim());
  }
  text = text.replace(/\$([^$\n]+)\$/g, (match, inner: string) =>
    looksLikeMath(String(inner)) ? String(inner).trim() : match,
  );

  text = replaceUntilStable(
    text,
    /\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
    (_match, numerator: string, denominator: string) =>
      `(${numerator.trim()})/(${denominator.trim()})`,
  );
  text = replaceUntilStable(
    text,
    /\\sqrt\s*(?:\[([^\]]*)\])?\s*\{([^{}]*)\}/g,
    (_match, _index: string, radicand: string) => `√(${radicand.trim()})`,
  );
  text = replaceUntilStable(
    text,
    /\\(?:text|mathrm|mathbf|mathit)\s*\{([^{}]*)\}/g,
    (_match, inner: string) => String(inner),
  );

  text = text
    .replace(/\\(?:quad|qquad)\b/g, ' ')
    .replace(/\\[,;:! ]/g, ' ')
    .replace(/\\[a-zA-Z]+/g, (match) => LATEX_SYMBOLS[match.slice(1)] ?? match);

  // Decided on the raw input: a formula carries at least one math marker, so a
  // lone `_` in prose or in an identifier is not a subscript.
  const hasMathIndicators = MATH_INDICATORS.test(raw);
  text = subscriptOrSuperscript(text, '^', SUPERSCRIPTS, hasMathIndicators);
  text = subscriptOrSuperscript(text, '_', SUBSCRIPTS, hasMathIndicators);
  return text;
};

/** Line height Excalidraw uses for the hand-drawn (Virgil) font. */
const LINE_HEIGHT = 1.35;

/**
 * Width of one glyph in the hand-drawn font, relative to the font size. The
 * values are deliberately generous: a box that is too small makes Excalidraw
 * wrap or clip the text, while a slightly too large one only adds whitespace.
 */
const glyphWidth = (char: string): number => {
  const code = char.codePointAt(0) ?? 0;
  if (char === ' ') {
    return 0.3;
  }
  // CJK, emoji and other full-width scripts take a full em.
  if (code > 0x2e7f) {
    return 1;
  }
  if (/[iljI.,:;'`!|()[\]]/.test(char)) {
    return 0.35;
  }
  if (/[mwMW@%&]/.test(char)) {
    return 0.85;
  }
  // Digits and capitals are wider than lowercase letters in Virgil.
  if (char === char.toUpperCase()) {
    return 0.72;
  }
  return 0.62;
};

/** Rough text box size: no canvas measuring is available outside the editor. */
export const measureText = (text: string, fontSize: number): { width: number; height: number } => {
  const lines = text.split('\n');
  const widest = lines.reduce(
    (max, line) =>
      Math.max(
        max,
        [...line].reduce((sum, char) => sum + glyphWidth(char), 0),
      ),
    0,
  );
  return {
    width: Math.max(40, Math.round(widest * fontSize)),
    height: Math.max(fontSize, Math.round(lines.length * fontSize * LINE_HEIGHT)),
  };
};

/** Breaks one line that is wider than `maxWidth`, at word boundaries. */
const wrapLine = (line: string, fontSize: number, maxWidth: number): string[] => {
  const fits = (value: string) => measureText(value, fontSize).width <= maxWidth;
  if (fits(line)) {
    return [line];
  }

  const wrapped: string[] = [];
  let current = '';
  for (const word of line.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (current) {
      wrapped.push(current);
      current = '';
    }
    if (fits(word)) {
      current = word;
      continue;
    }
    // A single word that is wider than the line is broken by characters.
    let chunk = '';
    for (const char of word) {
      if (chunk && !fits(chunk + char)) {
        wrapped.push(chunk);
        chunk = '';
      }
      chunk += char;
    }
    current = chunk;
  }
  if (current) {
    wrapped.push(current);
  }
  return wrapped.length > 0 ? wrapped : [line];
};

/**
 * Wraps prose to the width the board gives it, so long text stays inside the
 * page instead of running past the guide. Existing line breaks are preserved.
 */
export const wrapTextToWidth = (text: string, fontSize: number, maxWidth: number): string => {
  if (!text || maxWidth <= 0) {
    return text;
  }
  return text
    .split('\n')
    .flatMap((line) => wrapLine(line, fontSize, maxWidth))
    .join('\n');
};

export type BoardContext = {
  api: ExcalidrawImperativeAPI | null;
  controller: WhiteboardController;
  elements: readonly ExcalidrawElement[];
  frame: BBox;
};

export type BoardLookup = { board: BoardContext } | { error: string };

/**
 * The live board, or the reason it cannot be drawn on. Never throws: every
 * failure has to come back to the model as a readable tool result.
 */
export const requireBoard = (): BoardLookup => {
  if (!whiteboardEnabled()) {
    return { error: 'The whiteboard is not enabled in this room.' };
  }

  const controller = getWhiteboardController();
  const api = getWhiteboardExcalidrawAPI();
  if (!controller.getSnapshot() || !controller.isReadyForExternalWrite() || !api) {
    // A closed board can leave its CRDT snapshot behind, but without a live
    // editor writing into it only lands in a detached document.
    return { error: 'The whiteboard is not open on this device right now.' };
  }

  const elements = api.getSceneElements();

  return { board: { api, controller, elements, frame: getBoardFrame(elements) } };
};

/** Opens the whiteboard on this client, then hands back the live board. */
export const ensureBoardOpen = async (): Promise<BoardLookup> => {
  const error = await ensureWhiteboardSurface();
  return error ? { error } : requireBoard();
};

/** Cap on a decode: a test double (or a stalled browser) may never fire `onload`. */
const IMAGE_DECODE_TIMEOUT_MS = 250;

const withTimeout = async <T>(work: Promise<T>, ms: number): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Hands an inline image's bytes to Excalidraw and primes its decode cache, so
 * the picture paints without a file the local canvas never received.
 *
 * Call it again once the `image` element is committed: `addFiles` drops the
 * cache entry of every file it registers, and an element whose file is missing
 * from the scene files stays blank until something re-decodes it.
 */
export const registerAgentImageFiles = async (
  api: BoardContext['api'],
  files: readonly BinaryFileData[],
): Promise<void> => {
  if (!api?.addFiles || files.length === 0) {
    return;
  }
  const { preloadHtmlImage, primeExcalidrawImageCache } =
    await import('../../../whiteboard/helpers/handleFiles');
  await Promise.all(
    files.map((file) => withTimeout(preloadHtmlImage(file.dataURL), IMAGE_DECODE_TIMEOUT_MS)),
  );
  api.addFiles([...files]);
  primeExcalidrawImageCache(api, files);
};

export type CommitOptions = {
  toolName: string;
  /** False for intermediate steps of an animated drawing. */
  record?: boolean;
  /** Defaults to `record !== false`: intermediate steps never move the viewport. */
  scrollToContent?: boolean;
  /** Defaults to `record !== false`: only finished actions get the agent's pointer. */
  laserCue?: boolean;
  /**
   * Whether this write is persisted right away. Defaults to `record !== false`:
   * an animation loop writes many steps and only its last one pays for a save.
   */
  persistNow?: boolean;
};

/**
 * Writes agent elements into the page and, unless disabled, records them so
 * `whiteboard_manage_board` can undo exactly this action.
 */
export const commitAgentElements = (
  board: BoardContext,
  elements: readonly ExcalidrawElement[],
  options: CommitOptions,
): boolean => {
  if (elements.length === 0) {
    return false;
  }

  // Everything committed in one call is one batch: the elements share a
  // `batchId`, so later placements see them as a single block instead of
  // dropping content into the hollow spaces between them.
  const batchId =
    elements.map((element) => agentBatchId(customDataOf(element))).find(Boolean) ??
    agentElementId();

  // Every element that reaches the CRDT must carry the tag, including bound
  // label text elements Excalidraw generated on its own.
  const tagged = elements.map((element) => {
    const data = customDataOf(element);
    const merged = withAgentData(data, options.toolName, batchId);
    if (merged === data) {
      return element;
    }
    return { ...element, customData: asCustomData(merged) } as ExcalidrawElement;
  });

  const existing = new Map(board.elements.map((element) => [element.id, element]));
  const replaced = tagged
    .filter((element) => existing.has(element.id))
    .map((element) => ({ before: existing.get(element.id)!, after: element }));

  const record = options.record !== false;

  beginAgentWhiteboardTool();
  let ok = false;
  try {
    ok = board.controller.applyExternalElements(tagged, undefined, {
      persistNow: options.persistNow ?? record,
    });
  } finally {
    endAgentWhiteboardTool();
  }

  if (ok && record) {
    const snapshot = board.controller.getSnapshot();
    pushAgentAction({
      toolName: options.toolName,
      createdAt: Date.now(),
      fileId: snapshot?.fileId,
      page: snapshot?.page,
      added: [...tagged],
      replaced,
    });
  }

  // The audience has to see what was just written, including peers that are
  // following this client from another scroll position.
  if (ok && (options.scrollToContent ?? options.record !== false)) {
    board.controller.revealElementsInViewport(tagged);
  }

  // Point at what was just written, so the eye follows the agent's own work.
  if (ok && (options.laserCue ?? options.record !== false)) {
    traceElementsWithLaser(board, tagged);
  }
  return ok;
};

export type AnchorShift = {
  /** The anchor group's box after the move. */
  anchor: BBox;
  /** The page as it will look once the group has moved, for collision checks. */
  elements: ExcalidrawElement[];
  /** Only the elements that actually moved, to commit with the new content. */
  changes: ExcalidrawElement[];
};

/**
 * A centred agent group leaves no room beside it, so a side-by-side placement
 * would drop below the group instead of sitting next to it. Moving that lone
 * group to the page edge first lets both groups share one row.
 *
 * `neededWidth` is the width the caller wants beside the group; nothing moves
 * when the group is already against the edge, when another group shares its
 * band, or when even the edge would not leave that much room.
 */
export const rebalanceAnchorForSideBySide = (
  board: BoardContext,
  layout: LayoutMode,
  rawId: unknown,
  neededWidth: number,
): AnchorShift | null => {
  const toTheRight = layout === 'right_of_element';
  if (!toTheRight && layout !== 'left_of_element') {
    return null;
  }
  // An omitted or "last" anchor moves the group drawn most recently.
  const group = findComponentElements(board.elements, rawId, layout);
  if (group.length === 0) {
    return null;
  }

  const byId = new Map(board.elements.map((element) => [element.id, element]));
  // Only the agent's own work is moved: a participant's layout is theirs.
  if (!group.every((element) => isAgentElement(element, byId))) {
    return null;
  }

  const anchor = unionBBox(group.map(toBBox));
  const frame = board.frame;
  const minX = Math.round(frame.x + FRAME_PADDING);
  const maxX = Math.round(frame.x + frame.width - FRAME_PADDING);
  const targetX = toTheRight ? minX : maxX - anchor.width;
  const stripWidth = (x: number) =>
    toTheRight ? maxX - (x + anchor.width + BLOCK_GAP) : x - minX - BLOCK_GAP;

  if (Math.abs(targetX - anchor.x) < 1 || stripWidth(anchor.x) >= neededWidth) {
    return null;
  }
  if (stripWidth(targetX) < neededWidth) {
    return null;
  }
  // Another group already lives where the anchor would move: it would collide.
  const blocked = sceneBoxes(board.elements).some(
    (box) =>
      !sameBox(box, anchor) &&
      box.y < anchor.y + anchor.height &&
      box.y + box.height > anchor.y &&
      (toTheRight ? box.x < anchor.x : box.x + box.width > anchor.x + anchor.width),
  );
  if (blocked) {
    return null;
  }

  const dx = targetX - anchor.x;
  const changes: ExcalidrawElement[] = [];
  for (const element of group) {
    // Copy on write: a live CRDT element is never mutated in place.
    changes.push({ ...element, x: element.x + dx } as ExcalidrawElement);
  }
  const movedById = new Map(changes.map((element) => [element.id, element]));
  return {
    anchor: { ...anchor, x: targetX },
    elements: board.elements.map((element) => movedById.get(element.id) ?? element),
    changes,
  };
};

export type DrawnResult = {
  ok: true;
  /** The batch of everything this call drew, so later calls can anchor to it. */
  groupId?: string;
  /** The first element drawn, usable as `anchor_element_id` by later calls. */
  anchorElementId?: string;
  elementIds: string[];
  bbox: BBox;
  pageBounds: BBox;
};

export const drawnResult = (elements: readonly ExcalidrawElement[], frame?: BBox): DrawnResult => {
  const page = frame ?? getBoardFrame(elements);
  const groupId = elements[0] ? batchIdOf(elements[0]) : null;
  return {
    ok: true,
    ...(groupId ? { groupId } : {}),
    ...(elements[0] ? { anchorElementId: elements[0].id } : {}),
    elementIds: elements.map((element) => element.id),
    bbox:
      elements.length > 0 ? unionBBox(elements.map(toBBox)) : { x: 0, y: 0, width: 0, height: 0 },
    pageBounds: {
      x: page.x + FRAME_PADDING,
      y: page.y + FRAME_PADDING,
      width: maxA4ContentWidth(page),
      height: page.height * MAX_A4_PAGES - FRAME_PADDING * 2,
    },
  };
};

export const invalid = (error: string): { ok: false; error: string } => ({ ok: false, error });
