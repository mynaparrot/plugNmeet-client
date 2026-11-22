import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

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
  rebalanceAnchorForSideBySide,
  resolveContrastingStrokeColor,
  resolveFillColor,
  resolveStrokeColor,
  toExcalidrawElements,
  wrapTextToWidth,
  type BoardContext,
} from '../agentElements';
import {
  ANCHORED_LAYOUTS,
  BLOCK_GAP,
  FRAME_PADDING,
  MIN_SIDE_STRIP,
  anchoredElementId,
  findAnchorBox,
  findComponentElements,
  maxA4ContentWidth,
  readLayout,
  resolveAnchoredLayout,
  resolveExplicitOrFreePlacement,
  sceneBoxes,
  type LayoutMode,
  type Size,
} from '../layoutEngine';
import { isAgentElement } from '../sceneGraph';

const TOOL_NAME = 'whiteboard_write_content';

type Block = {
  text: string;
  emphasis: 'none' | 'bold' | 'highlight' | 'underline';
  columns?: string[];
};

const DEFAULT_FONT_SIZE: Record<string, number> = {
  heading: 32,
  body: 20,
  vocabulary_card: 22,
  sticky_note: 20,
  comparison_table: 18,
};

const STYLES = ['heading', 'body', 'vocabulary_card', 'sticky_note', 'comparison_table'] as const;
const EMPHASIS = ['none', 'bold', 'highlight', 'underline'] as const;

/** Table geometry: Excalidraw wraps the cell text inside these bounds. */
const MAX_TABLE_COLUMNS = 5;
const MIN_COLUMN_WIDTH = 140;
const MAX_COLUMN_WIDTH = 320;
const CELL_PADDING_X = 32;
const CELL_PADDING_Y = 24;
const MIN_ROW_HEIGHT = 44;
/** Vertical gap between two blocks. */
const BLOCK_SPACING = 12;
/**
 * Inner padding of a sticky note or vocabulary card, on every side. Excalidraw
 * keeps 5px of its own around bound text, so the card has to be wider than its
 * text by more than that or the label wraps unexpectedly.
 */
const CARD_PADDING = 22;
/** A card stays readable: a longer paragraph wraps inside the note. */
const MAX_CARD_TEXT_WIDTH = 640;
/** Extent of a highlight or underline beyond the text it marks. */
const HIGHLIGHT_PAD_X = 6;
const HIGHLIGHT_PAD_Y = 4;
const UNDERLINE_GAP = 4;

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** A `|---|---|` (or `--- | ---`) separator line under a Markdown table header. */
const TABLE_SEPARATOR = /^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*(?::?-{2,}:?\s*)?$/;

/** `| Tense | Form |` (or `Tense | Form`) as trimmed cells, or null when it is not one. */
const splitTableLine = (line: string): string[] | null => {
  if (!line.includes('|')) {
    return null;
  }
  const cells = line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
};

/**
 * A model sometimes hands a Markdown pipe table over as the text of one block.
 * Every line then becomes a table row, unless the text also holds prose, which
 * must never be dropped.
 */
const markdownTableRows = (text: string): string[][] | null => {
  const rows: string[][] = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || TABLE_SEPARATOR.test(line)) {
      continue;
    }
    const cells = splitTableLine(line);
    if (!cells) {
      return null;
    }
    rows.push(cells.slice(0, MAX_TABLE_COLUMNS).map((cell) => formatWhiteboardText(cell)));
  }
  return rows.length > 0 ? rows : null;
};

/**
 * Empty cells are kept on purpose: in a fill-in-the-blank table `["2 + 2 =", ""]`
 * the blank cell is a real column that must not collapse into its neighbour.
 */
const readColumns = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const columns = value
    .map((column) => formatWhiteboardText(asString(column)))
    .slice(0, MAX_TABLE_COLUMNS);
  return columns.some((column) => column.length > 0) ? columns : undefined;
};

const readBlocks = (raw: unknown, tableStyle: boolean): Block[] | null => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const blocks: Block[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    // A bare row may also be passed as its own array of cells: [ "Tense", "Form" ].
    const record = (Array.isArray(entry) ? {} : entry) as Record<string, unknown>;
    const emphasis = (EMPHASIS as readonly string[]).includes(String(record.emphasis))
      ? (record.emphasis as Block['emphasis'])
      : 'none';
    const columns = readColumns(record.columns) ?? readColumns(record.cells) ?? readColumns(entry);
    const rawText = formatWhiteboardText(asString(record.text));

    const rows = columns ? null : tableStyle ? markdownTableRows(rawText) : null;
    if (rows) {
      for (const cells of rows) {
        blocks.push({ text: cells.join(' | '), emphasis, columns: cells });
      }
      continue;
    }

    const text = rawText || (columns ? columns.filter(Boolean).join(' | ') : '');
    if (!text && !columns) {
      continue;
    }
    blocks.push({ text, emphasis, ...(columns ? { columns } : {}) });
  }
  return blocks.length > 0 ? blocks : null;
};

/** The anchor element itself, or the first element of the group it names. */
const findAnchor = (
  board: BoardContext,
  id: string,
  layout: LayoutMode,
): ExcalidrawElement | undefined =>
  board.elements.find((element) => element.id === id) ??
  findComponentElements(board.elements, id, layout)[0];

/** A grid row: any block carrying cells, plus single-cell rows of a table. */
const isTableRow = (block: Block, style: string): boolean => {
  const count = block.columns?.length ?? 0;
  return style === 'comparison_table' ? count >= 1 : count >= 2;
};

const cellsOf = (block: Block): string[] =>
  block.columns && block.columns.length > 0 ? block.columns : [block.text];

const blockHeight = (block: Block, fontSize: number): number => {
  const extra = block.emphasis === 'highlight' ? 12 : block.emphasis === 'underline' ? 10 : 0;
  return measureText(block.text, fontSize).height + extra;
};

const textWidth = (block: Block, fontSize: number): number =>
  Math.max(80, measureText(block.text, fontSize).width);

const isCardStyle = (style: string): boolean =>
  style === 'sticky_note' || style === 'vocabulary_card';

const bodyFontSizeOf = (block: Block, fontSize: number): number =>
  block.emphasis === 'bold' ? Math.round(fontSize * 1.15) : fontSize;

/** Text blocks wrap inside the page, cards wrap inside their own column. */
const isProse = (style: string): boolean => !isCardStyle(style) && style !== 'comparison_table';

const wrapBlocks = (
  blocks: readonly Block[],
  style: string,
  fontSize: number,
  availableWidth: number,
): Block[] => {
  const pageWidth = Math.max(120, availableWidth);
  const maxWidth = isCardStyle(style)
    ? Math.min(pageWidth - CARD_PADDING * 2, MAX_CARD_TEXT_WIDTH)
    : pageWidth;

  return blocks.map((block) => {
    if (isTableRow(block, style)) {
      return block;
    }
    const text = wrapTextToWidth(block.text, bodyFontSizeOf(block, fontSize), maxWidth);
    return text === block.text ? block : { ...block, text };
  });
};

type CardSize = { width: number; height: number };

/** A card is its text plus the padding on both sides, in both directions. */
const cardSize = (block: Block, fontSize: number): CardSize => {
  const metrics = measureText(block.text, bodyFontSizeOf(block, fontSize));
  return {
    width: metrics.width + CARD_PADDING * 2,
    height: metrics.height + CARD_PADDING * 2,
  };
};

type CardSlot = CardSize & { x: number; y: number };

/**
 * Cards read left to right and wrap onto a new row when the next one would
 * cross the available width, instead of forming one tall column.
 */
const flowCards = (
  sizes: readonly CardSize[],
  availableWidth: number,
): { slots: CardSlot[]; width: number; height: number } => {
  const limit = Math.max(availableWidth, ...sizes.map((size) => size.width));
  const slots: CardSlot[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let width = 0;

  for (const size of sizes) {
    if (x > 0 && x + size.width > limit) {
      y += rowHeight + BLOCK_SPACING;
      x = 0;
      rowHeight = 0;
    }
    slots.push({ x, y, width: size.width, height: size.height });
    x += size.width + BLOCK_SPACING;
    width = Math.max(width, x - BLOCK_SPACING);
    rowHeight = Math.max(rowHeight, size.height);
  }

  return { slots, width, height: y + rowHeight };
};

type TableLayout = { columnWidths: number[]; rowHeights: number[]; width: number };

/** Excalidraw wraps the cell label inside the column, so long cells need more lines. */
const cellHeight = (cell: string, fontSize: number, columnWidth: number): number => {
  const metrics = measureText(cell, fontSize);
  const innerWidth = Math.max(40, columnWidth - CELL_PADDING_X);
  const lines = cell
    .split('\n')
    .reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(measureText(line, fontSize).width / innerWidth)),
      0,
    );
  return Math.max(metrics.height, Math.ceil(lines * fontSize * 1.35));
};

/**
 * Column widths and row heights are measured once for the whole table, so the
 * grid lines up row by row instead of cell by cell.
 */
const buildTableLayout = (
  rows: Block[],
  fontSize: number,
  maxWidth = Number.POSITIVE_INFINITY,
): TableLayout => {
  if (rows.length === 0) {
    return { columnWidths: [], rowHeights: [], width: 0 };
  }

  const columnCount = Math.min(
    MAX_TABLE_COLUMNS,
    Math.max(...rows.map((row) => row.columns?.length ?? 1)),
  );

  const measuredWidths = Array.from({ length: columnCount }, (_, column) => {
    const measured = Math.max(
      ...rows.map((row) => {
        const cell = row.columns?.[column];
        return cell ? measureText(cell, fontSize).width : 0;
      }),
    );
    return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, measured + CELL_PADDING_X));
  });

  const total = measuredWidths.reduce((sum, width) => sum + width, 0);
  // A 5-column table can be wider than the A4 page: shrink every column by the
  // same factor so the grid still fits inside the guide.
  const factor = total > maxWidth ? maxWidth / total : 1;
  const columnWidths = measuredWidths.map((width) =>
    factor === 1 ? width : Math.max(1, Math.floor(width * factor)),
  );

  // Row heights use the final widths: a shrunk column wraps its text, and the
  // row has to grow with it so no cell text spills out of its border.
  const rowHeights = rows.map((row) => {
    const tallest = Math.max(
      ...cellsOf(row).map((cell, column) =>
        cellHeight(cell, fontSize, columnWidths[column] ?? MIN_COLUMN_WIDTH),
      ),
    );
    return Math.max(MIN_ROW_HEIGHT, tallest + CELL_PADDING_Y);
  });

  return { columnWidths, rowHeights, width: columnWidths.reduce((sum, w) => sum + w, 0) };
};

/**
 * One row of the grid: every cell is a bordered rectangle with a bound label, so
 * Excalidraw centres and wraps the text inside the cell.
 */
const renderTableRow = (
  block: Block,
  x: number,
  y: number,
  rowIndex: number,
  table: TableLayout,
  fontSize: number,
  strokeColor: string,
  data: unknown,
): unknown[] => {
  const cells = cellsOf(block);
  const height = table.rowHeights[rowIndex] ?? MIN_ROW_HEIGHT;
  const isHeaderRow = rowIndex === 0 || block.emphasis === 'bold';
  const backgroundColor = resolveFillColor(isHeaderRow ? 'blue' : 'white');

  let cellX = x;
  return table.columnWidths.map((width, column) => {
    const skeleton = {
      id: agentElementId(),
      type: 'rectangle',
      x: cellX,
      y,
      width,
      height,
      strokeColor,
      backgroundColor,
      fillStyle: 'solid',
      strokeWidth: 1,
      label: { text: cells[column] ?? '', fontSize, fontFamily: AGENT_FONT_FAMILY },
      customData: data,
    };
    cellX += width;
    return skeleton;
  });
};

type RenderedBlock = {
  skeletons: unknown[];
  height: number;
  textId?: string;
  highlightId?: string;
  underlineId?: string;
};

/**
 * One positioned block: its skeletons (converted in one batch) and its height.
 * `data` is the batch tag of the whole tool call, so every block of one write
 * shares a `batchId` and the page sees the write as a single block.
 */
const renderBlock = (
  block: Block,
  x: number,
  y: number,
  style: string,
  fontSize: number,
  strokeColor: string,
  data: unknown,
): RenderedBlock => {
  const skeletons: unknown[] = [];

  const bodyFontSize = bodyFontSizeOf(block, fontSize);
  const metrics = measureText(block.text, bodyFontSize);

  if (isCardStyle(style)) {
    const card = cardSize(block, fontSize);
    skeletons.push({
      id: agentElementId(),
      type: 'rectangle',
      x,
      y,
      width: card.width,
      height: card.height,
      strokeColor,
      backgroundColor: resolveFillColor(style === 'sticky_note' ? 'yellow' : 'white'),
      fillStyle: 'solid',
      strokeWidth: 1,
      roundness: { type: 3 },
      label: { text: block.text, fontSize: bodyFontSize, fontFamily: AGENT_FONT_FAMILY },
      customData: data,
    });
    return { skeletons, height: card.height };
  }

  const textId = agentElementId();
  const highlightId = block.emphasis === 'highlight' ? agentElementId() : undefined;
  const underlineId = block.emphasis === 'underline' ? agentElementId() : undefined;

  if (highlightId) {
    skeletons.push({
      id: highlightId,
      type: 'rectangle',
      x: x - HIGHLIGHT_PAD_X,
      y: y - HIGHLIGHT_PAD_Y,
      width: metrics.width + HIGHLIGHT_PAD_X * 2,
      height: metrics.height + HIGHLIGHT_PAD_Y * 2,
      strokeColor: 'transparent',
      backgroundColor: resolveFillColor('yellow'),
      fillStyle: 'solid',
      strokeWidth: 1,
      customData: data,
    });
  }

  skeletons.push({
    id: textId,
    type: 'text',
    x,
    y,
    width: metrics.width,
    height: metrics.height,
    text: block.text,
    fontSize: bodyFontSize,
    fontFamily: AGENT_FONT_FAMILY,
    strokeColor,
    textAlign: 'left',
    verticalAlign: 'top',
    customData: data,
  });

  if (underlineId) {
    skeletons.push({
      id: underlineId,
      type: 'line',
      x,
      y: y + metrics.height + UNDERLINE_GAP,
      width: metrics.width,
      height: 0,
      strokeColor,
      strokeWidth: 1,
      customData: data,
    });
  }

  return { skeletons, height: blockHeight(block, fontSize), textId, highlightId, underlineId };
};

/** One block of the batch, kept so the converted result can be reconciled. */
type BlockPlan = {
  /** Skeleton ids of the block, so a shift moves all of it. */
  ids: string[];
  /** Planned top of the block. */
  y: number;
  /** Planned height of the block. */
  height: number;
  /** A row of a table: its cells are kept flush instead of shifted. */
  row?: boolean;
  textId?: string;
  highlightId?: string;
  underlineId?: string;
};

const skeletonId = (skeleton: unknown): string => String((skeleton as { id?: unknown }).id ?? '');

const containerIdOf = (element: ExcalidrawElement): string | null =>
  (element as { containerId?: string | null }).containerId ?? null;

/**
 * Excalidraw measures and wraps text itself while the skeletons are converted,
 * so a line can come out taller than estimated. Highlights, underlines, table
 * rows and the blocks below are re-fitted to that real geometry: a mark is
 * never smaller than its text, a grid stays flush, and nothing overlaps.
 */
export const reconcileConvertedBlocks = (
  elements: readonly ExcalidrawElement[],
  plans: readonly BlockPlan[],
): ExcalidrawElement[] => {
  const byId = new Map(elements.map((element) => [element.id, element]));
  const labels = new Map<string, ExcalidrawElement>();
  for (const element of elements) {
    const containerId = containerIdOf(element);
    if (containerId) {
      labels.set(containerId, element);
    }
  }

  const move = (id: string, dy: number) => {
    const element = byId.get(id);
    if (element && dy !== 0) {
      byId.set(id, { ...element, y: element.y + dy } as ExcalidrawElement);
    }
  };
  const place = (id: string, patch: Partial<ExcalidrawElement>) => {
    const element = byId.get(id);
    if (element) {
      byId.set(id, { ...element, ...patch } as ExcalidrawElement);
    }
  };

  let shift = 0;
  for (const plan of plans) {
    for (const id of plan.ids) {
      move(id, shift);
      const label = labels.get(id);
      if (label) {
        move(label.id, shift);
      }
    }

    if (plan.row) {
      const cells = plan.ids.map((id) => byId.get(id)).filter((cell) => !!cell);
      if (cells.length > 0) {
        const height = Math.max(...cells.map((cell) => cell.height));
        const top = plan.y + shift;
        for (const cell of cells) {
          place(cell.id, { y: top, height });
          const label = labels.get(cell.id);
          if (label) {
            // The cell text stays centred when its row grows.
            place(label.id, { y: Math.round(top + (height - label.height) / 2) });
          }
        }
        shift += Math.max(0, height - plan.height);
      }
      continue;
    }

    const text = plan.textId ? byId.get(plan.textId) : undefined;
    if (text) {
      if (plan.highlightId) {
        place(plan.highlightId, {
          x: text.x - HIGHLIGHT_PAD_X,
          y: text.y - HIGHLIGHT_PAD_Y,
          width: text.width + HIGHLIGHT_PAD_X * 2,
          height: text.height + HIGHLIGHT_PAD_Y * 2,
        });
      }
      if (plan.underlineId) {
        place(plan.underlineId, {
          x: text.x,
          y: text.y + text.height + UNDERLINE_GAP,
          width: text.width,
        });
      }
    }

    const bottom = Math.max(
      plan.y + shift,
      ...plan.ids.map((id) => {
        const element = byId.get(id);
        return element ? element.y + element.height : 0;
      }),
    );
    shift += Math.max(0, Math.round(bottom - (plan.y + shift) - plan.height));
  }

  return elements.map((element) => byId.get(element.id) ?? element);
};

/**
 * `whiteboard_write_content`: structured teaching content with automatic
 * layout, so the model never has to compute pixel coordinates.
 */
export const executeWhiteboardWriteContentTool = async (
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const style = (STYLES as readonly string[]).includes(String(args.style))
    ? String(args.style)
    : 'body';
  const read =
    readBlocks(args.blocks, style === 'comparison_table') ??
    readBlocks(args.rows, style === 'comparison_table');
  if (!read) {
    return invalid(
      'blocks must be a non-empty array of { text } or { columns } objects (or pass rows for a table).',
    );
  }
  let blocks: Block[] = read;
  const requestedLayout = readLayout(args.layout);

  const requestedFont = Number(args.font_size);
  const fontSize =
    Number.isFinite(requestedFont) && requestedFont >= 12 && requestedFont <= 48
      ? Math.round(requestedFont)
      : (DEFAULT_FONT_SIZE[style] ?? DEFAULT_FONT_SIZE.body);

  const lookup = await ensureBoardOpen();
  if ('error' in lookup) {
    return invalid(lookup.error);
  }
  const context = lookup.board;

  // A relative layout with no anchor, or with "last"/"latest", is anchored to
  // the group drawn most recently; on an empty board there is nothing to sit
  // beside, so the block starts a fresh section instead of failing the call.
  const layout = resolveAnchoredLayout(context.elements, requestedLayout, args.anchor_element_id);
  const anchorId = asString(args.anchor_element_id);
  const anchored = ANCHORED_LAYOUTS.includes(layout);
  // An empty or "last" anchor is already resolved to the newest group.
  const anchorElement = anchored ? findAnchor(context, anchorId, layout) : undefined;
  if (anchored && !anchorElement) {
    return invalid(`anchor_element_id "${anchorId}" was not found on this page.`);
  }

  // A correction written beside the participant's work has to read as feedback,
  // never as their own writing in their own colour.
  const participantAnchor =
    anchored && anchorElement && !isAgentElement(anchorElement) ? anchorElement : null;
  const strokeColor = participantAnchor
    ? resolveContrastingStrokeColor(args.color, participantAnchor.strokeColor)
    : resolveStrokeColor(args.color);

  const pageWidth = maxA4ContentWidth(context.frame);
  const frameLeft = Math.round(context.frame.x + FRAME_PADDING);
  const frameRight = Math.round(context.frame.x + context.frame.width - FRAME_PADDING);

  const anchorBox = findAnchorBox(context.elements, anchorId, layout);
  // A centred agent group is moved to the page edge when the new block needs the
  // room beside it, so the pair shares a row instead of one dropping below.
  const shift = anchorBox
    ? rebalanceAnchorForSideBySide(
        context,
        layout,
        anchorId,
        isCardStyle(style)
          ? Math.min(
              pageWidth - anchorBox.width - BLOCK_GAP,
              MAX_CARD_TEXT_WIDTH + CARD_PADDING * 2,
            )
          : MIN_SIDE_STRIP,
      )
    : null;
  const anchor = shift?.anchor ?? anchorBox;
  const scene = shift?.elements ?? context.elements;

  // Width the anchor leaves beside it: cards and prose wrap inside that strip so
  // they stay on the anchor's row instead of dropping below it.
  const strip =
    !anchor || (layout !== 'right_of_element' && layout !== 'left_of_element')
      ? pageWidth
      : layout === 'right_of_element'
        ? frameRight - (anchor.x + anchor.width + BLOCK_GAP)
        : anchor.x - BLOCK_GAP - frameLeft;

  // Prose stays inside the page: long sentences are wrapped before they are
  // measured, so a block never starts wider than the guide.
  blocks = wrapBlocks(blocks, style, fontSize, pageWidth);
  const widestCard = isCardStyle(style)
    ? Math.max(...blocks.map((block) => cardSize(block, fontSize).width))
    : 0;
  // A card grid only goes beside an anchor when its widest card fits the strip;
  // a stack that cannot fit there drops below the anchor as one block.
  const flowWidth = Math.max(
    120,
    Math.min(
      pageWidth,
      strip >= (isCardStyle(style) ? widestCard : MIN_SIDE_STRIP) ? strip : pageWidth,
    ),
  );
  if (flowWidth < pageWidth) {
    blocks = wrapBlocks(blocks, style, fontSize, flowWidth);
  }

  const table = buildTableLayout(
    blocks.filter((block) => isTableRow(block, style)),
    fontSize,
    flowWidth,
  );

  const cardSizes = isCardStyle(style) ? blocks.map((block) => cardSize(block, fontSize)) : [];
  // Only a block drawn inside an anchor splits its group; every other layout
  // sees whole batches, so a placement never lands inside a diagram.
  const existingBoxes = sceneBoxes(scene, anchoredElementId(layout, anchorId));

  // Drawings start from the middle of the board; prose fills it from the left.
  const placement = { centered: !anchored && !isProse(style) };
  const place = (size: Size, rawX?: unknown, rawY?: unknown) =>
    resolveExplicitOrFreePlacement(
      existingBoxes,
      context.frame,
      size,
      rawX,
      rawY,
      layout,
      anchor,
      placement,
    );

  let rowIndex = 0;
  const heights = blocks.map((block) =>
    isTableRow(block, style)
      ? (table.rowHeights[rowIndex++] ?? MIN_ROW_HEIGHT)
      : blockHeight(block, fontSize),
  );

  // Rows of one table share their border, so only the edges of the grid and any
  // block that is not a table row get the usual gap.
  const gapAfter = (index: number): number => {
    const next = blocks[index + 1];
    if (!next) {
      return 0;
    }
    return isTableRow(blocks[index], style) && isTableRow(next, style) ? 0 : BLOCK_SPACING;
  };

  // Cards wrap inside the strip beside the anchor, so their first row shares the
  // anchor's top instead of being pushed under it.
  const cardFlow = isCardStyle(style) ? flowCards(cardSizes, flowWidth) : null;

  const contentWidth =
    cardFlow?.width ??
    Math.max(
      ...blocks.map((block) =>
        isTableRow(block, style) ? table.width : textWidth(block, fontSize),
      ),
    );
  const contentHeight =
    cardFlow?.height ?? heights.reduce((sum, height, index) => sum + height + gapAfter(index), 0);

  const origin = place({ width: contentWidth, height: contentHeight }, args.x, args.y);

  // Text that has to share the page with existing content wraps again inside
  // the width the origin actually leaves.
  if (isProse(style)) {
    const available = Math.min(pageWidth, frameRight - origin.x);
    if (available < pageWidth) {
      blocks = wrapBlocks(blocks, style, fontSize, available);
    }
  }

  const data = asCustomData(agentCustomData(TOOL_NAME));
  const skeletons: unknown[] = [];
  const plans: BlockPlan[] = [];
  let cursorY = origin.y;
  rowIndex = 0;

  for (const [index, block] of blocks.entries()) {
    const plan = (rendered: RenderedBlock, height: number, row = false): BlockPlan => ({
      ids: rendered.skeletons.map(skeletonId),
      y: cursorY,
      height,
      ...(row ? { row } : {}),
      ...(rendered.textId ? { textId: rendered.textId } : {}),
      ...(rendered.highlightId ? { highlightId: rendered.highlightId } : {}),
      ...(rendered.underlineId ? { underlineId: rendered.underlineId } : {}),
    });

    if (cardFlow) {
      const slot = cardFlow.slots[index];
      // A card sizes itself with padding, so it needs no reconciliation.
      skeletons.push(
        ...renderBlock(
          block,
          origin.x + slot.x,
          origin.y + slot.y,
          style,
          fontSize,
          strokeColor,
          data,
        ).skeletons,
      );
      continue;
    }

    if (isTableRow(block, style)) {
      const height = table.rowHeights[rowIndex] ?? MIN_ROW_HEIGHT;
      const rendered: RenderedBlock = {
        skeletons: renderTableRow(
          block,
          origin.x,
          cursorY,
          rowIndex,
          table,
          fontSize,
          strokeColor,
          data,
        ),
        height,
      };
      plans.push(plan(rendered, height, true));
      skeletons.push(...rendered.skeletons);
      cursorY += height + gapAfter(index);
      rowIndex++;
      continue;
    }

    const rendered = renderBlock(block, origin.x, cursorY, style, fontSize, strokeColor, data);
    plans.push(plan(rendered, rendered.height));
    skeletons.push(...rendered.skeletons);
    cursorY += rendered.height + gapAfter(index);
  }

  const converted: ExcalidrawElement[] = await toExcalidrawElements(skeletons, TOOL_NAME);
  const elements = reconcileConvertedBlocks(converted, plans);
  // A moved anchor group is committed with the new content: both groups land in
  // one write, so the pair never shows a half-finished layout on a peer.
  const changed = [...elements, ...(shift?.changes ?? [])];

  if (!commitAgentElements(context, changed, { toolName: TOOL_NAME })) {
    return invalid('The whiteboard refused the write.');
  }

  return drawnResult(elements, context.frame);
};
