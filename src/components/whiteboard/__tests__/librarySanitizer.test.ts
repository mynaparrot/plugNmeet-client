import { describe, expect, it } from 'vitest';

import { sanitizeLibraryBlob, sanitizeLibraryData } from '../helpers/librarySanitizer';

const libraryBlob = (data: unknown) =>
  new Blob([JSON.stringify(data)], { type: 'application/json' });

const readBlob = async (blob: Blob) => JSON.parse(await blob.text());

const arrow = (id: string, startBinding?: unknown, endBinding?: unknown) => ({
  id,
  type: 'arrow',
  ...(startBinding === undefined ? {} : { startBinding }),
  ...(endBinding === undefined ? {} : { endBinding }),
});

const rectangle = (id: string) => ({ id, type: 'rectangle' });

const binding = (elementId: unknown) => ({ elementId, focus: 0, gap: 1 });

describe('sanitizeLibraryData', () => {
  it('clears a binding whose target lives in another library item', () => {
    // Mirrors the shipped decision-flow-control v1 library shape.
    const data = {
      type: 'excalidrawlib',
      version: 1,
      library: [
        [rectangle('rect-a'), arrow('arrow-a', binding('rect-a'), binding('rect-in-other-item'))],
        [rectangle('rect-in-other-item')],
      ],
    };

    expect(sanitizeLibraryData(data)).toBe(true);
    expect(data.library).toEqual([
      [rectangle('rect-a'), arrow('arrow-a', binding('rect-a'), null)],
      // The other item's element is untouched.
      [rectangle('rect-in-other-item')],
    ]);
  });

  it('keeps valid bindings, including targets later in the same item', () => {
    const data = {
      type: 'excalidrawlib',
      version: 1,
      library: [
        [
          arrow('arrow-a', binding('rect-later'), binding('rect-earlier')),
          rectangle('rect-earlier'),
          rectangle('rect-later'),
        ],
      ],
    };

    expect(sanitizeLibraryData(data)).toBe(false);
    expect(data.library[0][0]).toEqual(
      arrow('arrow-a', binding('rect-later'), binding('rect-earlier')),
    );
  });

  it('leaves elements without binding keys untouched', () => {
    const data = {
      type: 'excalidrawlib',
      version: 1,
      library: [[rectangle('rect-a'), arrow('arrow-a')]],
    };

    expect(sanitizeLibraryData(data)).toBe(false);
    expect(data.library[0][1]).toEqual({ id: 'arrow-a', type: 'arrow' });
  });

  it('clears bindings whose elementId does not resolve within the same item', () => {
    const data = {
      type: 'excalidrawlib',
      version: 1,
      library: [[rectangle('rect-a'), arrow('arrow-a', binding('missing'), {})]],
    };

    expect(sanitizeLibraryData(data)).toBe(true);
    expect(data.library[0][1]).toEqual(arrow('arrow-a', null, null));
  });

  it('handles the v2 libraryItems envelope', () => {
    const data = {
      type: 'excalidrawlib',
      version: 2,
      libraryItems: [
        { id: 'item-1', status: 'published', elements: [arrow('arrow-a', binding('rect-b'))] },
        { id: 'item-2', status: 'published', elements: [rectangle('rect-b')] },
      ],
    };

    expect(sanitizeLibraryData(data)).toBe(true);
    expect(data.libraryItems).toEqual([
      { id: 'item-1', status: 'published', elements: [arrow('arrow-a', null)] },
      { id: 'item-2', status: 'published', elements: [rectangle('rect-b')] },
    ]);
  });

  it('leaves unrecognized items inside a recognized envelope untouched', () => {
    const data = {
      type: 'excalidrawlib',
      version: 2,
      libraryItems: [
        { id: 'item-1', elements: [arrow('arrow-a', binding('rect-x'))] },
        { id: 'bad' },
      ],
    };

    expect(sanitizeLibraryData(data)).toBe(true);
    expect(data.libraryItems).toEqual([
      { id: 'item-1', elements: [arrow('arrow-a', null)] },
      { id: 'bad' },
    ]);
  });

  it('ignores payloads that are not library files', () => {
    expect(sanitizeLibraryData(null)).toBe(false);
    expect(sanitizeLibraryData('excalidrawlib')).toBe(false);
    expect(sanitizeLibraryData({ type: 'excalidraw', version: 2, elements: [] })).toBe(false);
    expect(sanitizeLibraryData({ version: 1, library: [[arrow('arrow-a', binding('x'))]] })).toBe(
      false,
    );
  });
});

describe('sanitizeLibraryBlob', () => {
  it('returns a sanitized blob for a dangling binding', async () => {
    const blob = libraryBlob({
      type: 'excalidrawlib',
      version: 1,
      library: [
        [arrow('arrow-a', binding('rect-in-other-item'))],
        [rectangle('rect-in-other-item')],
      ],
    });

    const sanitized = await sanitizeLibraryBlob(blob);
    expect(sanitized).not.toBe(blob);
    expect(sanitized.type).toBe('application/json');

    const data = await readBlob(sanitized);
    expect(data.library).toEqual([[arrow('arrow-a', null)], [rectangle('rect-in-other-item')]]);
  });

  it('returns the original blob when nothing needs clearing', async () => {
    const blob = libraryBlob({
      type: 'excalidrawlib',
      version: 1,
      library: [[rectangle('rect-a'), arrow('arrow-a', binding('rect-a'))]],
    });

    expect(await sanitizeLibraryBlob(blob)).toBe(blob);
  });

  it('passes invalid JSON through unchanged', async () => {
    const blob = new Blob(['{not json'], { type: 'application/json' });
    expect(await sanitizeLibraryBlob(blob)).toBe(blob);
  });

  it('passes unrecognized payloads through unchanged', async () => {
    const blob = libraryBlob({ hello: 'world' });
    expect(await sanitizeLibraryBlob(blob)).toBe(blob);
  });
});
