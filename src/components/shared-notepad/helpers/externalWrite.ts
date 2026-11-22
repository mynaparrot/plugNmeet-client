import type { Block, BlockNoteEditor } from '@blocknote/core';

import type {
  NotepadBlockSummary,
  NotepadContentReader,
  NotepadExternalWriteApplier,
} from '../NotepadController';

type InlineItem = { type?: string; text?: string; styles?: Record<string, unknown> };

const UNDERLINE_OPEN = '<u>';
const UNDERLINE_CLOSE = '</u>';

const blockText = (block: Block): string => {
  const content = (block as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((item) => {
      const text = (item as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    })
    .join('');
};

/**
 * BlockNote's markdown parser keeps `<u>word</u>` as literal text, so the tags
 * are rewritten into `styles.underline` runs here. The state survives across
 * inline items, because a parser may put the tags in their own run and keep
 * `**bold**` inside a second one.
 */
const inlineWithUnderline = (content: unknown[]): unknown[] => {
  const out: unknown[] = [];
  let open = false;

  for (const item of content) {
    const inline = item as InlineItem;
    if (typeof inline.text !== 'string') {
      out.push(item);
      continue;
    }

    const segments: { text: string; underline: boolean }[] = [];
    let rest = inline.text;
    for (;;) {
      const marker = open ? UNDERLINE_CLOSE : UNDERLINE_OPEN;
      const index = rest.toLowerCase().indexOf(marker);
      if (index === -1) {
        segments.push({ text: rest, underline: open });
        break;
      }
      segments.push({ text: rest.slice(0, index), underline: open });
      rest = rest.slice(index + marker.length);
      open = !open;
    }

    for (const segment of segments) {
      if (!segment.text) {
        continue;
      }
      out.push({
        type: inline.type ?? 'text',
        text: segment.text,
        styles: segment.underline ? { ...inline.styles, underline: true } : (inline.styles ?? {}),
      });
    }
  }

  return out;
};

/** Rewrites `<u>` runs into inline styles and demotes H1 to H2, in one tree walk. */
const normalizeBlock = (block: Block): Block => {
  const content = (block as { content?: unknown }).content;
  const level = (block.props as { level?: unknown }).level;
  const demote = block.type === 'heading' && level === 1;

  return {
    ...block,
    props: demote ? { ...block.props, level: 2 } : block.props,
    ...(Array.isArray(content) ? { content: inlineWithUnderline(content) } : {}),
    children: block.children.map(normalizeBlock),
  } as Block;
};

/** Markdown -> blocks, with real underline styles and H1 demoted to H2. */
export const parseMarkdownWithUnderline = (editor: BlockNoteEditor, markdown: string): Block[] =>
  editor.tryParseMarkdownToBlocks(markdown).map(normalizeBlock);

/** Plain text of the runs BlockNote marked as underlined. */
const underlinedTexts = (block: Block): string[] => {
  const content = (block as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return [];
  }
  return content
    .map((item) => item as InlineItem)
    .filter((item) => item.styles?.underline === true && typeof item.text === 'string')
    .map((item) => item.text as string)
    .filter(Boolean);
};

/**
 * BlockNote does not emit `<u>` in its markdown, so underlined runs are wrapped
 * back in the tag when the note is read out.
 */
const blockToMarkdownWithUnderline = (editor: BlockNoteEditor, block: Block): string => {
  const markdown = editor.blocksToMarkdownLossy([block]).trim();
  return underlinedTexts(block).reduce(
    // A function replacement keeps `$&` and friends in the text literal.
    (out, text) => out.replace(text, () => `${UNDERLINE_OPEN}${text}${UNDERLINE_CLOSE}`),
    markdown,
  );
};

/** Whitespace-insensitive text, so re-wrapping a line never reads as an edit. */
const normalizedBlockText = (block: Block): string => blockText(block).replace(/\s+/g, ' ').trim();

const flattenBlocks = (blocks: Block[]): Block[] =>
  blocks.flatMap((block) => [block, ...flattenBlocks(block.children)]);

const blockIds = (blocks: Block[]): Set<string> =>
  new Set(flattenBlocks(blocks).map((block) => block.id));

const headingLevel = (block: Block): number =>
  Number((block.props as { level?: number }).level ?? 0);

/** Index of the last block that still belongs to the section starting at `headingIndex`. */
const findSectionEnd = (blocks: Block[], headingIndex: number): number => {
  const level = headingLevel(blocks[headingIndex]);
  let end = headingIndex;
  for (let i = headingIndex + 1; i < blocks.length; i++) {
    if (blocks[i].type === 'heading' && headingLevel(blocks[i]) <= level) {
      break;
    }
    end = i;
  }
  return end;
};

const insertAtEnd = (editor: BlockNoteEditor, blocks: Block[]) => {
  const document = editor.document;
  const last = document[document.length - 1];
  if (last) {
    editor.insertBlocks(blocks, last, 'after');
  }
};

/**
 * Builds the applier an external writer (e.g. the AI agent tool dispatcher)
 * uses through `NotepadController.applyExternalWrite`. The markdown -> block
 * conversion lives here because only an editor instance owns the schema.
 * Returns the blocks this write produced, so their authorship can be recorded.
 */
export const createExternalWriteApplier =
  (editor: BlockNoteEditor): NotepadExternalWriteApplier =>
  ({ mode, markdown, heading, blockId }) => {
    const before = blockIds(editor.document);
    const blocks = parseMarkdownWithUnderline(editor, markdown);
    if (blocks.length === 0) {
      return [];
    }

    if (mode === 'replace_block') {
      const targetId = blockId?.trim();
      const target = targetId
        ? flattenBlocks(editor.document).find((block) => block.id === targetId)
        : undefined;
      // An unknown id is reported as "nothing written", so the caller can tell
      // the agent to read the note again instead of silently doing nothing.
      if (!target) {
        return [];
      }

      const res = editor.replaceBlocks([target.id], blocks);
      const written = new Map<string, string>();
      for (const block of (res?.insertedBlocks ?? []) as Block[]) {
        written.set(block.id, normalizedBlockText(block));
      }
      // In-place rewrites often keep the id, so the updated block is added too.
      const updated = flattenBlocks(editor.document).find((block) => block.id === target.id);
      if (updated) {
        written.set(updated.id, normalizedBlockText(updated));
      }
      return [...written].map(([id, text]) => ({ id, text }));
    }

    if (mode === 'replace') {
      editor.replaceBlocks(editor.document, blocks);
    } else {
      const document = editor.document;
      const target = mode === 'insert_section' ? heading?.trim().toLowerCase() : undefined;
      const headingIndex = target
        ? document.findIndex(
            (block) => block.type === 'heading' && blockText(block).trim().toLowerCase() === target,
          )
        : -1;

      if (headingIndex === -1) {
        const toInsert = heading
          ? parseMarkdownWithUnderline(editor, `### ${heading}\n\n${markdown}`)
          : blocks;
        insertAtEnd(editor, toInsert);
      } else {
        const sectionEnd = document[findSectionEnd(document, headingIndex)];
        if (sectionEnd) {
          editor.insertBlocks(blocks, sectionEnd, 'after');
        }
      }
    }

    return flattenBlocks(editor.document)
      .filter((block) => !before.has(block.id))
      .map((block) => ({ id: block.id, text: normalizedBlockText(block) }));
  };

/**
 * Reads the notepad as author-tagged blocks for an external reader. A block
 * counts as externally written only while its text still matches what the
 * external writer put there, so a filled-in blank or a rewritten answer reads
 * as participant work; `originalText` keeps the prompt line it came from.
 */
export const createNotepadContentReader = (
  editor: BlockNoteEditor,
  externalTextFor: (blockId: string) => string | null,
): NotepadContentReader => {
  return () => {
    const blocks: NotepadBlockSummary[] = [];

    for (const block of flattenBlocks(editor.document)) {
      const text = normalizedBlockText(block);
      if (!text) {
        continue;
      }
      const original = externalTextFor(block.id);
      const author = original !== null && original === text ? 'external' : 'participant';
      blocks.push({
        id: block.id,
        type: block.type,
        text,
        markdown: blockToMarkdownWithUnderline(editor, block) || text,
        author,
        ...(author === 'participant' && original !== null ? { originalText: original } : {}),
      });
    }

    return {
      markdown: editor.blocksToMarkdownLossy().trim(),
      blocks,
      externalBlocks: blocks.filter((block) => block.author === 'external'),
      participantBlocks: blocks.filter((block) => block.author === 'participant'),
    };
  };
};
