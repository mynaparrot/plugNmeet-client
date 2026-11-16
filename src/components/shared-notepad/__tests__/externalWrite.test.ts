import { describe, expect, it, vi } from 'vitest';
import type { BlockNoteEditor } from '@blocknote/core';

import { createExternalWriteApplier, createNotepadContentReader } from '../helpers/externalWrite';

/*
 * The applier reports which blocks an external write produced, and the reader
 * splits the note by author. Both are pure editor conversions, so a small stub
 * editor is enough; the real schema is irrelevant to the logic.
 */

type StubBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  content: { type: 'text'; text: string }[];
  children: StubBlock[];
};

const textBlock = (id: string, text: string, children: StubBlock[] = []): StubBlock => ({
  id,
  type: 'paragraph',
  props: {},
  content: [{ type: 'text', text }],
  children,
});

const headingBlock = (id: string, text: string, level = 2): StubBlock => ({
  id,
  type: 'heading',
  props: { level },
  content: [{ type: 'text', text }],
  children: [],
});

const plainText = (blocks: StubBlock[]) =>
  blocks.map((block) => block.content.map((item) => item.text).join('')).join('\n');

const makeEditor = (document: StubBlock[]) => {
  let seq = 0;
  const editor = {
    document,
    tryParseMarkdownToBlocks: vi.fn((markdown: string) =>
      markdown
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line.trim());
          seq += 1;
          return headingMatch
            ? headingBlock(`new-${seq}`, headingMatch[2], headingMatch[1].length)
            : textBlock(`new-${seq}`, line.trim());
        }),
    ),
    replaceBlocks: vi.fn((removed: (StubBlock | string)[], inserted: StubBlock[]) => {
      // Mirrors BlockNote: only the given ids are swapped, the rest stays.
      const removedIds = new Set(
        removed.map((block) => (typeof block === 'string' ? block : block.id)),
      );
      const at = editor.document.findIndex((block) => removedIds.has(block.id));
      const rest = editor.document.filter((block) => !removedIds.has(block.id));
      const index = at < 0 ? rest.length : at;
      editor.document = [...rest.slice(0, index), ...inserted, ...rest.slice(index)];
      return { insertedBlocks: inserted };
    }),
    insertBlocks: vi.fn((blocks: StubBlock[], reference: StubBlock) => {
      const index = editor.document.indexOf(reference);
      editor.document = [
        ...editor.document.slice(0, index + 1),
        ...blocks,
        ...editor.document.slice(index + 1),
      ];
    }),
    blocksToMarkdownLossy: vi.fn((blocks?: StubBlock[]) => plainText(blocks ?? editor.document)),
  };
  return editor;
};

const asEditor = (editor: ReturnType<typeof makeEditor>) => editor as unknown as BlockNoteEditor;

describe('createExternalWriteApplier', () => {
  it('returns only the blocks this write inserted', () => {
    const existing = textBlock('old-1', 'existing note');
    const editor = makeEditor([existing]);

    const written = createExternalWriteApplier(asEditor(editor))({
      mode: 'append',
      markdown: 'first line\nsecond line',
    });

    expect(written.map((block) => block.id)).toEqual(['new-1', 'new-2']);
    expect(written.every((block) => !block.id.startsWith('old-'))).toBe(true);
  });

  it('returns the normalized text of every followed block', () => {
    const editor = makeEditor([textBlock('old-1', 'existing note')]);

    const written = createExternalWriteApplier(asEditor(editor))({
      mode: 'append',
      markdown: '1. I   ___ (go)',
    });

    expect(written).toEqual([{ id: 'new-1', text: '1. I ___ (go)' }]);
  });

  it('reports every block of a replace write, including nested children', () => {
    const editor = makeEditor([textBlock('old-1', 'old')]);
    const child = textBlock('new-child', 'nested');
    editor.tryParseMarkdownToBlocks = vi.fn(() => [textBlock('new-1', 'first', [child])]) as never;

    const written = createExternalWriteApplier(asEditor(editor))({
      mode: 'replace',
      markdown: 'x',
    });

    expect(written.map((block) => block.id)).toEqual(['new-1', 'new-child']);
    expect(editor.document.map((block) => block.id)).toEqual(['new-1']);
  });

  it('inserts after the matching heading section', () => {
    const editor = makeEditor([
      headingBlock('h-1', 'Recap'),
      textBlock('old-1', 'old body'),
      headingBlock('h-2', 'Next'),
    ]);

    const written = createExternalWriteApplier(asEditor(editor))({
      mode: 'insert_section',
      markdown: 'new body',
      heading: 'Recap',
    });

    expect(written.map((block) => block.id)).toEqual(['new-1']);
    expect(editor.document.map((block) => block.id)).toEqual(['h-1', 'old-1', 'new-1', 'h-2']);
  });

  it('returns nothing when markdown produced no blocks', () => {
    const editor = makeEditor([]);

    expect(
      createExternalWriteApplier(asEditor(editor))({ mode: 'append', markdown: '   ' }),
    ).toEqual([]);
  });

  it('rewrites a single block in place for replace_block', () => {
    const editor = makeEditor([textBlock('b1', '1. I ___ (go)'), textBlock('b2', '1. I goed')]);
    const replacement = textBlock('b2', '1. I went');
    editor.tryParseMarkdownToBlocks = vi.fn(() => [replacement]) as never;

    const written = createExternalWriteApplier(asEditor(editor))({
      mode: 'replace_block',
      markdown: '1. I went',
      blockId: 'b2',
    });

    expect(written).toEqual([{ id: 'b2', text: '1. I went' }]);
    expect(editor.replaceBlocks).toHaveBeenCalledWith(
      ['b2'],
      [expect.objectContaining({ id: 'b2' })],
    );
    // Only the marked block changed; the other one keeps its text.
    expect(plainText(editor.document)).toBe('1. I ___ (go)\n1. I went');
  });

  it('reports nothing for an unknown block_id and leaves the note alone', () => {
    const editor = makeEditor([textBlock('b1', 'note')]);

    const written = createExternalWriteApplier(asEditor(editor))({
      mode: 'replace_block',
      markdown: 'marked',
      blockId: 'missing',
    });

    expect(written).toEqual([]);
    expect(editor.replaceBlocks).not.toHaveBeenCalled();
  });

  it('turns <u>underlined</u> markdown into underlined inline content', () => {
    const editor = makeEditor([textBlock('old-1', 'old')]);

    createExternalWriteApplier(asEditor(editor))({
      mode: 'append',
      markdown: 'I <u>went</u> home',
    });

    expect(editor.document[1].content).toEqual([
      { type: 'text', text: 'I ', styles: {} },
      { type: 'text', text: 'went', styles: { underline: true } },
      { type: 'text', text: ' home', styles: {} },
    ]);
  });

  it('keeps bold inside <u> when the parser splits the tags into their own runs', () => {
    const editor = makeEditor([textBlock('old-1', 'old')]);
    // What BlockNote's parser produces for `<u>**very wrong**</u>`.
    editor.tryParseMarkdownToBlocks = vi.fn(() => [
      {
        ...textBlock('new-1', ''),
        content: [
          { type: 'text', text: '<u>', styles: {} },
          { type: 'text', text: 'very wrong', styles: { bold: true } },
          { type: 'text', text: '</u>', styles: {} },
        ],
      },
    ]) as never;

    createExternalWriteApplier(asEditor(editor))({ mode: 'append', markdown: 'x' });

    expect(editor.document[1].content).toEqual([
      { type: 'text', text: 'very wrong', styles: { bold: true, underline: true } },
    ]);
  });
});

describe('createNotepadContentReader', () => {
  const read = (document: StubBlock[], external: Record<string, string> = {}) =>
    createNotepadContentReader(asEditor(makeEditor(document)), (id) => external[id] ?? null)();

  it('keeps an untouched externally written block as external', () => {
    const content = read([textBlock('b1', '1. I ___ (go)')], { b1: '1. I ___ (go)' });

    expect(content.blocks).toEqual([
      {
        id: 'b1',
        type: 'paragraph',
        text: '1. I ___ (go)',
        markdown: '1. I ___ (go)',
        author: 'external',
      },
    ]);
    expect(content.externalBlocks).toHaveLength(1);
    expect(content.participantBlocks).toHaveLength(0);
  });

  it('turns an edited agent block into participant work and keeps the prompt', () => {
    const content = read([textBlock('b1', '1. I went to school')], { b1: '1. I ___ (go)' });

    expect(content.participantBlocks).toEqual([
      {
        id: 'b1',
        type: 'paragraph',
        text: '1. I went to school',
        markdown: '1. I went to school',
        author: 'participant',
        originalText: '1. I ___ (go)',
      },
    ]);
    expect(content.externalBlocks).toHaveLength(0);
  });

  it('treats a block the agent never wrote as participant work', () => {
    const content = read([textBlock('b2', 'my own note')]);

    expect(content.participantBlocks[0]).toMatchObject({ id: 'b2', author: 'participant' });
    expect(content.participantBlocks[0].originalText).toBeUndefined();
  });

  it('wraps underlined runs back into <u> tags when reading', () => {
    const underlined: StubBlock = {
      ...textBlock('b1', 'I went'),
      content: [
        { type: 'text', text: 'I ' },
        { type: 'text', text: 'went' },
      ],
    };
    (underlined.content[1] as { styles?: unknown }).styles = { underline: true };

    const content = read([underlined]);

    expect(content.blocks[0].markdown).toBe('I <u>went</u>');
  });

  it('ignores whitespace-only blocks and keeps nested ones', () => {
    const content = read([
      textBlock('b1', '   '),
      textBlock('b2', 'parent', [textBlock('b3', 'child')]),
    ]);

    expect(content.blocks.map((block) => block.id)).toEqual(['b2', 'b3']);
    // The full-note markdown is the editor's job; only non-empty blocks are summarized.
    expect(content.markdown).toBe('parent');
  });
});
