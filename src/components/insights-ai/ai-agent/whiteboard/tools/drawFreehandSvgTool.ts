import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { BinaryFileData } from '@excalidraw/excalidraw/types';

import {
  AGENT_FONT_FAMILY,
  agentCustomData,
  agentElementId,
  asCustomData,
  buildFreeDrawElement,
  commitAgentElements,
  drawnResult,
  ensureBoardOpen,
  formatWhiteboardText,
  invalid,
  measureText,
  nextSceneIndex,
  resolveStrokeColor,
  toExcalidrawElements,
  type BoardContext,
} from '../agentElements';
import { pushAgentAction } from '../agentHistory';
import {
  anchoredElementId,
  findAnchorBox,
  fitInside,
  readLayout,
  resolveExplicitOrFreePlacement,
  sceneBoxes,
  type Size,
} from '../layoutEngine';

const TOOL_NAME = 'whiteboard_draw_freehand_svg';

export type Point = [number, number];

const MIN_SIZE = 40;
const MAX_SIZE = 1200;
const CURVE_SAMPLES = 10;
/** Straight edges are subdivided too, so freedraw smoothing cannot round their corners. */
const STRAIGHT_SAMPLES = 5;
const MAX_STROKES = 24;
/** Longest edge of an inserted picture, unless the model asks for a size. */
const DEFAULT_IMAGE_SIZE = 320;
/** Delay between animated strokes, so it reads as drawing rather than a flash. */
const STROKE_DELAY_MS = 90;
/** Fallback size of an SVG `<text>` that declares no `font-size`. */
const DEFAULT_TEXT_SIZE = 24;

export type SvgText = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  width: number;
  height: number;
};

/** Commands and numbers in document order, so repeats stay with their command. */
const TOKEN = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
const ARG_COUNT: Record<string, number> = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7 };
const MAX_POINTS = 4000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const quadratic = (p0: Point, p1: Point, p2: Point, t: number): Point => {
  const mt = 1 - t;
  return [
    mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
    mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
  ];
};

const cubic = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const mt = 1 - t;
  return [
    mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0],
    mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1],
  ];
};

/** A straight edge as a run of points: the start is excluded, the end included. */
const straightRun = (from: Point, to: Point): Point[] => {
  const points: Point[] = [];
  for (let step = 1; step <= STRAIGHT_SAMPLES; step++) {
    const t = step / STRAIGHT_SAMPLES;
    points.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
  }
  return points;
};

/** Connects vertices, optionally closing the loop, without rounding the corners. */
const chainPoints = (vertices: Point[], closed: boolean): Point[] | null => {
  if (vertices.length < 2) {
    return null;
  }
  const points: Point[] = [[vertices[0][0], vertices[0][1]]];
  for (let i = 1; i < vertices.length; i++) {
    points.push(...straightRun(vertices[i - 1], vertices[i]));
  }
  if (closed) {
    points.push(...straightRun(vertices[vertices.length - 1], vertices[0]));
  }
  return points;
};

/**
 * Samples an SVG path `d` into one stroke per subpath. Each `M`/`m` starts a new
 * stroke: Excalidraw freedraw treats `points` as one continuous pen stroke, so
 * subpaths must never share an array or they would be joined by a stray line.
 * Curves are flattened in parameter space; straight edges are subdivided so
 * freedraw smoothing keeps their corners crisp.
 */
export const sampleSvgPathSubpaths = (d: string): Point[][] => {
  const tokens: (string | number)[] = [];
  for (const match of d.matchAll(TOKEN)) {
    tokens.push(match[1] ?? Number(match[2]));
  }

  const subpaths: Point[][] = [];
  let points: Point[] = [];
  let current: Point = [0, 0];
  let subpathStart: Point = [0, 0];
  let total = 0;
  let index = 0;

  const finish = () => {
    if (points.length > 1) {
      subpaths.push(points);
    }
    points = [];
  };

  const extend = (run: Point[]) => {
    for (const point of run) {
      if (total >= MAX_POINTS) {
        return;
      }
      points.push(point);
      current = point;
      total++;
    }
  };

  // Commands other than `M` can open a subpath; it starts where the pen is.
  const ensureSubpath = () => {
    if (points.length === 0) {
      points = [[current[0], current[1]]];
      total++;
    }
  };

  while (index < tokens.length && total < MAX_POINTS) {
    const token = tokens[index];
    if (typeof token !== 'string') {
      index++; // stray number without a command
      continue;
    }
    index++;

    const relative = token !== token.toUpperCase();
    const command = token.toUpperCase();

    if (command === 'Z') {
      ensureSubpath();
      extend(straightRun(current, subpathStart));
      finish();
      current = [subpathStart[0], subpathStart[1]];
      continue;
    }

    const count = ARG_COUNT[command] ?? 2;
    let isFirstGroup = true;

    // One or more argument groups, until the next command token shows up.
    while (
      index + count <= tokens.length &&
      typeof tokens[index] === 'number' &&
      typeof tokens[index + count - 1] === 'number'
    ) {
      const args = tokens.slice(index, index + count) as number[];
      index += count;

      const baseX = relative ? current[0] : 0;
      const baseY = relative ? current[1] : 0;
      const effective = command === 'M' && !isFirstGroup ? 'L' : command;
      isFirstGroup = false;

      switch (effective) {
        case 'M': {
          finish();
          current = [baseX + args[0], baseY + args[1]];
          subpathStart = [current[0], current[1]];
          points = [[current[0], current[1]]];
          total++;
          break;
        }
        case 'L':
        case 'T': {
          ensureSubpath();
          extend(straightRun(current, [baseX + args[0], baseY + args[1]]));
          break;
        }
        case 'H': {
          ensureSubpath();
          extend(straightRun(current, [baseX + args[0], current[1]]));
          break;
        }
        case 'V': {
          ensureSubpath();
          extend(straightRun(current, [current[0], baseY + args[0]]));
          break;
        }
        case 'C': {
          ensureSubpath();
          const c1: Point = [baseX + args[0], baseY + args[1]];
          const c2: Point = [baseX + args[2], baseY + args[3]];
          const to: Point = [baseX + args[4], baseY + args[5]];
          const run: Point[] = [];
          for (let step = 1; step <= CURVE_SAMPLES; step++) {
            run.push(cubic(current, c1, c2, to, step / CURVE_SAMPLES));
          }
          extend(run);
          break;
        }
        case 'S': {
          ensureSubpath();
          const c2: Point = [baseX + args[0], baseY + args[1]];
          const to: Point = [baseX + args[2], baseY + args[3]];
          const run: Point[] = [];
          for (let step = 1; step <= CURVE_SAMPLES; step++) {
            run.push(cubic(current, current, c2, to, step / CURVE_SAMPLES));
          }
          extend(run);
          break;
        }
        case 'Q': {
          ensureSubpath();
          const control: Point = [baseX + args[0], baseY + args[1]];
          const to: Point = [baseX + args[2], baseY + args[3]];
          const run: Point[] = [];
          for (let step = 1; step <= CURVE_SAMPLES; step++) {
            run.push(quadratic(current, control, to, step / CURVE_SAMPLES));
          }
          extend(run);
          break;
        }
        default: {
          // Unsupported command: treat its coordinates as a straight line.
          ensureSubpath();
          extend(straightRun(current, [baseX + args[0], baseY + args[1]]));
          break;
        }
      }
    }

    if (index < tokens.length && typeof tokens[index] === 'number') {
      index++; // incomplete argument group: never loop forever on it
    }
  }

  finish();
  return subpaths;
};

const attr = (tag: string, name: string): number => {
  const match = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag);
  const value = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(value) ? value : 0;
};

const attrText = (tag: string, name: string): string => {
  const match = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag);
  return match ? match[1] : '';
};

const ellipsePoints = (cx: number, cy: number, rx: number, ry: number): Point[] => {
  const points: Point[] = [];
  for (let step = 0; step <= 48; step++) {
    const angle = (step / 48) * Math.PI * 2;
    points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
  }
  return points;
};

/** `points="x,y x,y …"` of a polyline or polygon. */
const polygonPoints = (tag: string): Point[] => {
  const values = (attrText(tag, 'points').match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const points: Point[] = [];
  for (let i = 0; i + 1 < values.length; i += 2) {
    points.push([values[i], values[i + 1]]);
  }
  return points;
};

/**
 * Turns the allowed SVG subset into user-space strokes, one stroke per drawn
 * line. `path` (per subpath), `line`, `polyline`, `polygon`, `circle`, `ellipse`
 * and `rect` are read, as the tool schema promises — anything else in the markup
 * is ignored rather than rejected.
 */
export const sampleSvgStrokes = (svg: string): Point[][] => {
  const strokes: Point[][] = [];
  const tags = svg.match(/<(path|line|polyline|polygon|circle|ellipse|rect)\b[^>]*>/gi) ?? [];

  const push = (points: Point[] | null) => {
    if (points && points.length > 1 && strokes.length < MAX_STROKES) {
      strokes.push(points);
    }
  };

  for (const tag of tags) {
    const name = /^<([a-z]+)/i.exec(tag)?.[1]?.toLowerCase() ?? '';

    if (name === 'path') {
      for (const points of sampleSvgPathSubpaths(attrText(tag, 'd'))) {
        push(points);
      }
      continue;
    }
    if (name === 'line') {
      push(
        chainPoints(
          [
            [attr(tag, 'x1'), attr(tag, 'y1')],
            [attr(tag, 'x2'), attr(tag, 'y2')],
          ],
          false,
        ),
      );
      continue;
    }
    if (name === 'polyline' || name === 'polygon') {
      push(chainPoints(polygonPoints(tag), name === 'polygon'));
      continue;
    }
    if (name === 'circle') {
      const r = attr(tag, 'r');
      push(ellipsePoints(attr(tag, 'cx'), attr(tag, 'cy'), r, r));
      continue;
    }
    if (name === 'ellipse') {
      push(ellipsePoints(attr(tag, 'cx'), attr(tag, 'cy'), attr(tag, 'rx'), attr(tag, 'ry')));
      continue;
    }
    if (name === 'rect') {
      const x = attr(tag, 'x');
      const y = attr(tag, 'y');
      const width = attr(tag, 'width');
      const height = attr(tag, 'height');
      push(
        chainPoints(
          [
            [x, y],
            [x + width, y],
            [x + width, y + height],
            [x, y + height],
          ],
          true,
        ),
      );
    }
  }

  return strokes;
};

const XML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

const decodeXmlEntities = (value: string): string =>
  value.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => XML_ENTITIES[entity] ?? entity);

/**
 * The `<text>` of an SVG picture, measured in user space so it can become a real
 * Excalidraw text element instead of being dropped in strokes mode.
 */
export const extractSvgTexts = (svg: string): SvgText[] => {
  const texts: SvgText[] = [];
  const tags = svg.match(/<text\b[^>]*>[\s\S]*?<\/text\s*>/gi) ?? [];

  for (const tag of tags) {
    const open = /^<text\b[^>]*>/i.exec(tag)?.[0] ?? '';
    const inner = tag
      .replace(/^<text\b[^>]*>/i, '')
      .replace(/<\/text\s*>$/i, '')
      .replace(/<[^>]*>/g, '');
    const text = formatWhiteboardText(decodeXmlEntities(inner).trim());
    if (!text) {
      continue;
    }

    const requested = attr(open, 'font-size') || attr(open, 'fontSize');
    const fontSize =
      requested > 0 ? Math.min(64, Math.max(12, Math.round(requested))) : DEFAULT_TEXT_SIZE;
    const metrics = measureText(text, fontSize);
    texts.push({
      text,
      x: attr(open, 'x'),
      // The baseline sits at `y`: the box starts above it.
      y: (attr(open, 'y') || fontSize) - fontSize * 0.85,
      fontSize,
      ...metrics,
    });
  }

  return texts;
};

const boundsOf = (strokes: Point[][]) => {
  const xs = strokes.flat().map(([x]) => x);
  const ys = strokes.flat().map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

/**
 * Bounds of the strokes together with the text boxes. A decoration drawn under
 * a formula then stays under it instead of defining the whole drawing's box.
 */
const boundsOfDrawing = (strokes: Point[][], texts: readonly SvgText[]) => {
  const points: Point[] = [
    ...strokes.flat(),
    ...texts.flatMap((text) => [
      [text.x, text.y] as Point,
      [text.x + text.width, text.y + text.height] as Point,
    ]),
  ];
  return points.length > 0 ? boundsOf([points]) : { minX: 0, minY: 0, width: 0, height: 0 };
};

const clampSize = (value: unknown, fallback: number): number => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(num)));
};

const SVG_TAG = /<svg\b[^>]*>/i;

/** Reads an attribute of the `<svg>` tag itself (`viewBox` is never `x`). */
const svgAttr = (tag: string, name: string): string => {
  const match = new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag);
  return match ? match[1] : '';
};

const toBase64 = (value: string): string => {
  let binary = '';
  for (const byte of new TextEncoder().encode(value)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

/** Elements that can run code or navigate away, removed together with their contents. */
const DANGEROUS_TAGS = [
  'script',
  'foreignObject',
  'iframe',
  'object',
  'embed',
  'applet',
  'meta',
  'link',
];

const EVENT_HANDLER = /\son[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const URI_ATTRIBUTE = /\s(?:xlink:href|href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const SCRIPT_URI = /(?:javascript|vbscript|data:text\/html)/i;
const CSS_URL = /\burl\s*\(\s*['"]?[^)]*['"]?\s*\)/gi;

/** Drops whitespace and control characters, which browsers ignore inside a URL. */
const stripBlanks = (value: string): string =>
  Array.from(value)
    .filter((char) => char > ' ')
    .join('');

/** Reads through whitespace and entities, so `&#106;avascript:` cannot slip past. */
const decodeUriValue = (value: string): string =>
  value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/&colon;?/gi, ':')
    .replace(/&[a-z]+;?/gi, '');

const isScriptUri = (value: string): boolean => SCRIPT_URI.test(stripBlanks(decodeUriValue(value)));

/**
 * Removes script, foreign content, inline handlers and script URLs from the
 * model's markup before it is wrapped or encoded into a `data:` URL. The schema
 * only asks for a shape, so the markup itself is never trusted.
 */
export const sanitizeSvgMarkup = (raw: string): string => {
  let svg = raw;
  for (const tag of DANGEROUS_TAGS) {
    svg = svg
      // Paired tags first: their contents have to go with them.
      .replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '')
      .replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
  }
  svg = svg.replace(EVENT_HANDLER, '');
  svg = svg.replace(URI_ATTRIBUTE, (match, ...groups) => {
    const value = String(groups[0] ?? groups[1] ?? groups[2] ?? '');
    return isScriptUri(value) ? '' : match;
  });
  return svg.replace(CSS_URL, (match) => (isScriptUri(match) ? '' : match));
};

/** The picture is rendered by a browser too, so its `<text>` is normalized as well. */
const formatSvgTextTags = (markup: string): string =>
  markup.replace(
    /(<text\b[^>]*>)([\s\S]*?)(<\/text\s*>)/gi,
    (match, open: string, inner: string, close: string) =>
      /<[a-z]/i.test(inner) ? match : `${open}${formatWhiteboardText(inner)}${close}`,
  );

/**
 * Makes the markup a self-contained SVG document: bare primitives get a wrapper
 * with a viewBox and visible line defaults, and an `<svg>` root gets the missing
 * `xmlns`/`viewBox` so a browser can decode it from a data URL.
 */
const toSvgDocument = (
  svg: string,
  strokes: Point[][],
  strokeColor: string,
  strokeWidth: number,
): { markup: string; width: number; height: number } => {
  const measured = strokes.length > 0 ? boundsOf(strokes) : null;
  const box =
    measured && measured.width > 0 && measured.height > 0
      ? `${measured.minX} ${measured.minY} ${measured.width} ${measured.height}`
      : null;

  const open = SVG_TAG.exec(svg);
  if (!open) {
    const viewBox = box ?? `0 0 ${DEFAULT_IMAGE_SIZE * 2} ${DEFAULT_IMAGE_SIZE}`;
    const [, , width, height] = viewBox.split(' ').map(Number);
    return {
      markup: formatSvgTextTags(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" ` +
          `height="${height}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" ` +
          `stroke-linecap="round" stroke-linejoin="round">${svg}</svg>`,
      ),
      width,
      height,
    };
  }

  const tag = open[0];
  const viewBox = svgAttr(tag, 'viewBox');
  const declared = viewBox.split(/[\s,]+/).map(Number);
  const width =
    (declared.length === 4 && declared[2] > 0 ? declared[2] : 0) ||
    Number(svgAttr(tag, 'width')) ||
    measured?.width ||
    DEFAULT_IMAGE_SIZE;
  const height =
    (declared.length === 4 && declared[3] > 0 ? declared[3] : 0) ||
    Number(svgAttr(tag, 'height')) ||
    measured?.height ||
    DEFAULT_IMAGE_SIZE;

  const missing: string[] = [];
  if (!/\sxmlns\s*=/i.test(tag)) {
    missing.push('xmlns="http://www.w3.org/2000/svg"');
  }
  if (!viewBox) {
    missing.push(`viewBox="${box ?? `0 0 ${width} ${height}`}"`);
  }
  const markup =
    missing.length === 0
      ? svg
      : svg.replace(tag, tag.replace(/\s*(\/?)>$/, ` ${missing.join(' ')}$1>`));

  return { markup: formatSvgTextTags(markup), width, height };
};

/**
 * Label text below a drawing, so callers can place it under either render mode.
 * A caption sits centred under its picture, like a figure caption.
 */
const labelSkeleton = (
  label: string,
  origin: { x: number; y: number; width: number },
  top: number,
  strokeColor: string,
  customData: never,
): unknown[] => {
  if (!label) {
    return [];
  }
  const metrics = measureText(label, 18);
  return [
    {
      id: agentElementId(),
      type: 'text',
      x: origin.x + Math.max(0, Math.round((origin.width - metrics.width) / 2)),
      y: origin.y + top + 12,
      width: metrics.width,
      height: metrics.height,
      text: label,
      fontSize: 18,
      fontFamily: AGENT_FONT_FAMILY,
      strokeColor,
      textAlign: 'left',
      verticalAlign: 'top',
      customData,
    },
  ];
};

type SvgDrawInput = {
  svg: string;
  strokes: Point[][];
  texts: SvgText[];
  args: Record<string, unknown>;
  strokeColor: string;
  strokeWidth: number;
  label: string;
};

/**
 * Origin and final size of the drawing. A picture asked to sit inside an element
 * (a sun in a participant's circle) is shrunk to fit that element first.
 */
const resolveSvgPlacement = (
  context: BoardContext,
  input: SvgDrawInput,
  size: Size,
): { x: number; y: number; width: number; height: number } => {
  const layout = readLayout(input.args.layout);
  const anchor = findAnchorBox(context.elements, input.args.anchor_element_id);
  const fitted = fitInside(size, layout, anchor);
  const origin = resolveExplicitOrFreePlacement(
    sceneBoxes(context.elements, anchoredElementId(layout, input.args.anchor_element_id)),
    context.frame,
    fitted,
    input.args.x,
    input.args.y,
    layout,
    anchor,
    { centered: true },
  );
  return { ...origin, ...fitted };
};

/**
 * Inserts the markup as one crisp `image` element whose binary data travels
 * inside the element itself (`customData.fileUrl`), so peers render it without a
 * server upload. Returns null when this canvas cannot register a file.
 */
const insertSvgImage = async (
  context: BoardContext,
  input: SvgDrawInput,
): Promise<Record<string, unknown> | null> => {
  if (!context.api?.addFiles) {
    return null;
  }

  const document = toSvgDocument(input.svg, input.strokes, input.strokeColor, input.strokeWidth);
  const aspect = document.height > 0 ? document.width / document.height : 1;
  const placed = resolveSvgPlacement(context, input, {
    width: clampSize(
      input.args.width,
      aspect >= 1 ? DEFAULT_IMAGE_SIZE : Math.round(DEFAULT_IMAGE_SIZE * aspect),
    ),
    height: clampSize(
      input.args.height,
      aspect >= 1 ? Math.round(DEFAULT_IMAGE_SIZE / aspect) : DEFAULT_IMAGE_SIZE,
    ),
  });

  const fileId = agentElementId();
  const dataURL = `data:image/svg+xml;base64,${toBase64(document.markup)}`;
  const fileData = {
    id: fileId,
    dataURL,
    mimeType: 'image/svg+xml',
    created: Date.now(),
  } as BinaryFileData;

  // Registered before the element lands, so the local canvas paints it at once.
  context.api.addFiles([fileData]);

  const data = asCustomData({
    ...agentCustomData(TOOL_NAME),
    fileUrl: dataURL,
    isOfficeFile: false,
  });

  const elements = await toExcalidrawElements(
    [
      {
        id: agentElementId(),
        type: 'image',
        fileId,
        x: placed.x,
        y: placed.y,
        width: placed.width,
        height: placed.height,
        status: 'saved',
        customData: data,
      },
      ...labelSkeleton(input.label, placed, placed.height, input.strokeColor, data),
    ],
    TOOL_NAME,
  );

  if (elements.length === 0 || !commitAgentElements(context, elements, { toolName: TOOL_NAME })) {
    return invalid('The whiteboard refused the write.');
  }
  return drawnResult(elements);
};

/** Draws the primitives one freedraw stroke at a time, like a hand sketch. */
const drawSvgStrokes = async (
  context: BoardContext,
  input: SvgDrawInput,
): Promise<Record<string, unknown>> => {
  const bounds = boundsOfDrawing(input.strokes, input.texts);
  const placed = resolveSvgPlacement(context, input, {
    width: clampSize(input.args.width, Math.max(MIN_SIZE, Math.round(bounds.width) || MIN_SIZE)),
    height: clampSize(input.args.height, Math.max(MIN_SIZE, Math.round(bounds.height) || MIN_SIZE)),
  });
  const scale = Math.min(
    placed.width / Math.max(bounds.width, 1),
    placed.height / Math.max(bounds.height, 1),
  );
  const animate = input.args.animate !== false;

  const data = asCustomData(agentCustomData(TOOL_NAME));
  let index = nextSceneIndex(context.elements);
  const strokeElements: ExcalidrawElement[] = [];

  for (const stroke of input.strokes) {
    const canvasPoints: Point[] = stroke.map(([x, y]) => [
      placed.x + (x - bounds.minX) * scale,
      placed.y + (y - bounds.minY) * scale,
    ]);
    // Excalidraw frees offsets from the element's own x/y, so a stroke carries
    // its own top-left and points relative to it. Offsetting them from the whole
    // drawing's bounds makes width/height mismatch the points and clips them.
    const strokeMinX = Math.min(...canvasPoints.map(([x]) => x));
    const strokeMinY = Math.min(...canvasPoints.map(([, y]) => y));
    strokeElements.push(
      buildFreeDrawElement({
        id: agentElementId(),
        x: Math.round(strokeMinX),
        y: Math.round(strokeMinY),
        points: canvasPoints.map(([x, y]) => [
          Number((x - strokeMinX).toFixed(2)),
          Number((y - strokeMinY).toFixed(2)),
        ]),
        strokeColor: input.strokeColor,
        strokeWidth: input.strokeWidth,
        index,
        customData: data,
      }),
    );
    index += 'V';
  }

  // `<text>` of the markup becomes a real text element, so a formula survives
  // the stroke rendering and stays editable on the board.
  const textElements = await toExcalidrawElements(
    input.texts.map((text) => ({
      id: agentElementId(),
      type: 'text',
      x: Math.round(placed.x + (text.x - bounds.minX) * scale),
      y: Math.round(placed.y + (text.y - bounds.minY) * scale),
      width: Math.max(1, Math.round(text.width * scale)),
      height: Math.max(1, Math.round(text.height * scale)),
      text: text.text,
      fontSize: Math.max(8, Math.round(text.fontSize * scale)),
      fontFamily: AGENT_FONT_FAMILY,
      strokeColor: input.strokeColor,
      textAlign: 'left',
      verticalAlign: 'top',
      customData: data,
    })),
    TOOL_NAME,
  );

  const labelElements = await toExcalidrawElements(
    labelSkeleton(input.label, placed, Math.round(bounds.height * scale), input.strokeColor, data),
    TOOL_NAME,
  );

  const all = [...strokeElements, ...textElements, ...labelElements];

  if (animate && strokeElements.length > 1) {
    // Bring the whole drawing into view first, so the strokes appear on screen
    // instead of off-canvas.
    context.controller.revealElementsInViewport(all);
    // Stroke by stroke, so the room sees the drawing happening.
    for (const element of strokeElements) {
      if (!commitAgentElements(context, [element], { toolName: TOOL_NAME, record: false })) {
        return invalid('The whiteboard refused the write.');
      }
      await delay(STROKE_DELAY_MS);
    }
    const tail = [...textElements, ...labelElements];
    const committed =
      tail.length === 0 ||
      commitAgentElements(context, tail, { toolName: TOOL_NAME, record: false });
    if (!committed) {
      return invalid('The whiteboard refused the write.');
    }
    pushAgentAction({ toolName: TOOL_NAME, createdAt: Date.now(), added: all, replaced: [] });
    return drawnResult(all);
  }

  if (!commitAgentElements(context, all, { toolName: TOOL_NAME })) {
    return invalid('The whiteboard refused the write.');
  }
  return drawnResult(all);
};

/**
 * `whiteboard_draw_freehand_svg`: by default the whole markup is inserted as one
 * crisp SVG image, so an illustration lands complete. With render_as="strokes"
 * the primitives become animated hand-drawn freedraw strokes instead.
 */
export const executeWhiteboardDrawFreehandSvgTool = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  // Sanitized once here, so both the image and the stroke path only ever see
  // markup that is safe to wrap and encode.
  const svg = sanitizeSvgMarkup(typeof args.svg === 'string' ? args.svg : '').trim();
  const inner = svg.replace(SVG_TAG, '').replace(/<\/svg\s*>/gi, '');
  if (!/<[a-z][\w:-]*/i.test(inner)) {
    return invalid(
      'svg must contain at least one shape (path, line, polyline, polygon, circle, ellipse or rect).',
    );
  }

  const lookup = await ensureBoardOpen();
  if ('error' in lookup) {
    return invalid(lookup.error);
  }
  const context = lookup.board;

  const requestedWidth = Number(args.stroke_width);
  const input: SvgDrawInput = {
    svg,
    strokes: sampleSvgStrokes(svg),
    texts: extractSvgTexts(svg),
    args,
    strokeColor: resolveStrokeColor(args.stroke_color),
    strokeWidth:
      Number.isFinite(requestedWidth) && requestedWidth >= 1 && requestedWidth <= 4
        ? Math.round(requestedWidth)
        : 2,
    label: formatWhiteboardText(typeof args.label === 'string' ? args.label.trim() : ''),
  };

  if (args.render_as !== 'strokes') {
    // A picture keeps every curve, fill and text of the markup, so it is the
    // default for illustrations. Without an API there is no way to register the
    // file, and the strokes below are the only fallback.
    const drawn = await insertSvgImage(context, input);
    if (drawn) {
      return drawn;
    }
  }

  if (input.strokes.length === 0 && input.texts.length === 0) {
    return invalid(
      'svg must contain at least one path, line, polyline, polygon, circle, ellipse, rect or text for a stroke drawing.',
    );
  }
  return drawSvgStrokes(context, input);
};
