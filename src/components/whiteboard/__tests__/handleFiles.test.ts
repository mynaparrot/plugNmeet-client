import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BinaryFileData, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

const { idbGet, idbStore } = vi.hoisted(() => ({
  idbGet: vi.fn(),
  idbStore: vi.fn(),
}));

vi.mock('../../../helpers/libs/idb', () => ({
  DB_STORE_NAMES: {
    IMAGE_CACHE: 'imageCache',
    OFFICE_PAGE_META_CACHE: 'officePageMetaCache',
  },
  idbGet,
  idbStore,
}));

// Keep this unit test free of the browser-only modules handleFiles pulls in.
vi.mock('../../../helpers/utils', () => ({
  getConfigValue: (_key: string, fallback: unknown) => fallback,
  randomString: () => 'random-id',
}));
vi.mock('../../../store', () => ({
  store: { getState: () => ({ whiteboard: {} }), dispatch: vi.fn() },
}));
vi.mock('../../../store/slices/whiteboard', () => ({ addWhiteboardUploadedOfficeFile: vi.fn() }));
vi.mock('../../../helpers/api/plugNmeetAPI', () => ({ default: vi.fn() }));
vi.mock('../../../helpers/fileUpload', () => ({ uploadResumableFile: vi.fn() }));
vi.mock('plugnmeet-protocol-js', () => ({
  GetRoomUploadedFilesReqSchema: {},
  GetRoomUploadedFilesResSchema: {},
  RoomUploadedFileType: {},
}));
vi.mock('@bufbuild/protobuf', () => ({ create: vi.fn(), fromBinary: vi.fn(), toBinary: vi.fn() }));
vi.mock('@excalidraw/excalidraw', () => ({
  convertToExcalidrawElements: () => [],
  newElementWith: (element: unknown) => element,
}));
vi.mock('../export-pdf/types', () => ({
  DEFAULT_A4_MARGIN: 20,
  DEFAULT_PAGE_ORIENTATION: 'portrait',
  VIRTUAL_WORKSPACE_WIDTH: 2000,
  VIRTUAL_WORKSPACE_HEIGHT: 2000,
}));
vi.mock('../export-pdf/utils', () => ({
  getPageSize: () => ({ width: 1000, height: 1400 }),
  pageSizeFromMetaPixels: () => null,
  resolvePageOrientation: (orientation: string) => orientation,
}));

import {
  cleanProcessedImageElementsMap,
  fetchAndCacheImage,
  preloadHtmlImage,
  primeExcalidrawImageCache,
} from '../helpers/handleFiles';

class FakeFileReader {
  onload: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  result: string | null = null;

  readAsDataURL() {
    this.result = 'data:image/png;base64,AA==';
    queueMicrotask(() => this.onload?.());
  }
}

/** Counts constructions so a shared decode can be asserted. */
let imageConstructions = 0;

/** Fake `<img>` that loads as a 40x20 bitmap. */
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  width = 0;
  height = 0;
  decode = () => Promise.resolve();

  private _src = '';

  constructor() {
    imageConstructions++;
  }

  get src() {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      this.naturalWidth = 40;
      this.naturalHeight = 20;
      this.onload?.();
    });
  }
}

/** Fake `<img>` that always fails to load. */
class FailingImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  private _src = '';

  get src() {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => this.onerror?.());
  }
}

const pngFile = (id: string, dataURL: string): BinaryFileData =>
  ({ id, dataURL, mimeType: 'image/png', created: 0 }) as unknown as BinaryFileData;

describe('fetchAndCacheImage', () => {
  beforeEach(() => {
    idbGet.mockReset();
    idbStore.mockReset();
    vi.stubGlobal('FileReader', FakeFileReader);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deduplicates concurrent in-flight fetches for the same url', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, blob: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    idbGet.mockResolvedValue(undefined);

    const url = 'https://example.com/in-flight.png';
    const [first, second] = await Promise.all([fetchAndCacheImage(url), fetchAndCacheImage(url)]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toBe('data:image/png;base64,AA==');
    expect(second).toBe(first);
    expect(idbStore).toHaveBeenCalledTimes(1);
  });

  it('serves subsequent calls from the in-memory cache', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, blob: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    idbGet.mockResolvedValue(undefined);

    const url = 'https://example.com/memory.png';
    const first = await fetchAndCacheImage(url);

    idbGet.mockClear();
    const second = await fetchAndCacheImage(url);

    expect(second).toBe(first);
    expect(idbGet).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the IDB cache and promotes it to memory', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    idbGet.mockResolvedValue('data:image/png;base64,cached');

    const url = 'https://example.com/idb.png';
    expect(await fetchAndCacheImage(url)).toBe('data:image/png;base64,cached');

    idbGet.mockClear();
    expect(await fetchAndCacheImage(url)).toBe('data:image/png;base64,cached');
    expect(idbGet).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('preloadHtmlImage', () => {
  beforeEach(() => {
    imageConstructions = 0;
    vi.stubGlobal('Image', FakeImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shares one decode between concurrent and later calls', async () => {
    const dataURL = 'data:image/png;base64,PRELOAD';
    const [first, second] = await Promise.all([
      preloadHtmlImage(dataURL),
      preloadHtmlImage(dataURL),
    ]);
    const third = await preloadHtmlImage(dataURL);

    expect(imageConstructions).toBe(1);
    expect(first).toBe(second);
    expect(third).toBe(first);
  });

  it('uses the decoded size for image dimensions', async () => {
    const image = await preloadHtmlImage('data:image/png;base64,SIZE');
    expect(image?.naturalWidth).toBe(40);
    expect(image?.naturalHeight).toBe(20);
  });

  it('returns null when Image is unavailable or decoding fails', async () => {
    vi.unstubAllGlobals();
    expect(await preloadHtmlImage('data:image/png;base64,NO-IMAGE')).toBeNull();

    vi.stubGlobal('Image', FailingImage);
    expect(await preloadHtmlImage('data:image/png;base64,BROKEN')).toBeNull();
  });
});

describe('primeExcalidrawImageCache', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', FakeImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes decoded images into Excalidraw’s image cache', async () => {
    const dataURL = 'data:image/png;base64,PRIME';
    const image = await preloadHtmlImage(dataURL);

    const imageCache = new Map<string, unknown>();
    const excalidrawAPI = {
      selection: { app: { imageCache } },
    } as unknown as ExcalidrawImperativeAPI;

    expect(primeExcalidrawImageCache(excalidrawAPI, [pngFile('file-1', dataURL)])).toBe(true);

    expect(imageCache.get('file-1')).toEqual({ image, mimeType: 'image/png' });
  });

  it('skips files that were not decoded and reports the partial prime', () => {
    const imageCache = new Map<string, unknown>();
    const excalidrawAPI = {
      selection: { app: { imageCache } },
    } as unknown as ExcalidrawImperativeAPI;

    const primed = primeExcalidrawImageCache(excalidrawAPI, [
      pngFile('file-2', 'data:image/png;base64,NOPE'),
    ]);

    expect(primed).toBe(false);
    expect(imageCache.size).toBe(0);
  });

  it('falls back to AppViewport when the selection API is gone', async () => {
    const dataURL = 'data:image/png;base64,VIEWPORT';
    const image = await preloadHtmlImage(dataURL);

    const imageCache = new Map<string, unknown>();
    const excalidrawAPI = {
      setViewport: { app: { imageCache } },
    } as unknown as ExcalidrawImperativeAPI;

    expect(primeExcalidrawImageCache(excalidrawAPI, [pngFile('file-5', dataURL)])).toBe(true);

    expect(imageCache.get('file-5')).toEqual({ image, mimeType: 'image/png' });
  });

  it('returns false instead of throwing when the internal cache is removed', async () => {
    const dataURL = 'data:image/png;base64,REMOVED';
    await preloadHtmlImage(dataURL);

    // `imageCache` renamed/removed on a future `App`.
    const renamed = { selection: { app: { images: new Map() } } };
    // `app` back reference dropped entirely.
    const noApp = { selection: {} };
    // `selection` removed from the imperative API.
    const noSelection = {};

    for (const api of [renamed, noApp, noSelection]) {
      expect(() =>
        primeExcalidrawImageCache(api as unknown as ExcalidrawImperativeAPI, [
          pngFile('file-3', dataURL),
        ]),
      ).not.toThrow();
      expect(
        primeExcalidrawImageCache(api as unknown as ExcalidrawImperativeAPI, [
          pngFile('file-3', dataURL),
        ]),
      ).toBe(false);
    }
  });

  it('returns false instead of throwing when an internal getter throws', () => {
    const excalidrawAPI = {
      get selection(): never {
        throw new Error('renamed in a future Excalidraw version');
      },
    } as unknown as ExcalidrawImperativeAPI;

    expect(
      primeExcalidrawImageCache(excalidrawAPI, [pngFile('file-4', 'data:image/png;base64,X')]),
    ).toBe(false);
  });
});

describe('cleanProcessedImageElementsMap', () => {
  const files = () => ({
    'file-1': pngFile('file-1', 'data:image/png;base64,A'),
    'file-2': pngFile('file-2', 'data:image/png;base64,B'),
  });

  it('clears the files held by Excalidraw and its image cache', () => {
    const imageCache = new Map<string, unknown>([['file-1', { image: {}, mimeType: 'image/png' }]]);
    const excalidrawFiles = files();
    const excalidrawAPI = {
      getFiles: () => excalidrawFiles,
      selection: { app: { imageCache } },
    } as unknown as ExcalidrawImperativeAPI;

    cleanProcessedImageElementsMap(excalidrawAPI);

    expect(Object.keys(excalidrawFiles)).toHaveLength(0);
    expect(imageCache.size).toBe(0);
  });

  it('falls back to AppViewport for the image cache', () => {
    const imageCache = new Map<string, unknown>([['file-2', {}]]);
    const excalidrawFiles = files();
    const excalidrawAPI = {
      getFiles: () => excalidrawFiles,
      setViewport: { app: { imageCache } },
    } as unknown as ExcalidrawImperativeAPI;

    cleanProcessedImageElementsMap(excalidrawAPI);

    expect(Object.keys(excalidrawFiles)).toHaveLength(0);
    expect(imageCache.size).toBe(0);
  });

  it('still clears the files when no image cache can be found', () => {
    const excalidrawFiles = files();
    const excalidrawAPI = {
      getFiles: () => excalidrawFiles,
      selection: {},
    } as unknown as ExcalidrawImperativeAPI;

    expect(() => cleanProcessedImageElementsMap(excalidrawAPI)).not.toThrow();
    expect(Object.keys(excalidrawFiles)).toHaveLength(0);
  });

  it('is a no-op when no API is given', () => {
    expect(() => cleanProcessedImageElementsMap()).not.toThrow();
    expect(() => cleanProcessedImageElementsMap(null)).not.toThrow();
    expect(() => cleanProcessedImageElementsMap(undefined)).not.toThrow();
  });

  it('does not throw when Excalidraw internals are gone or throwing', () => {
    const noGetFiles = {} as unknown as ExcalidrawImperativeAPI;
    const throwingInternals = {
      getFiles: () => {
        throw new Error('renamed in a future Excalidraw version');
      },
    } as unknown as ExcalidrawImperativeAPI;
    const throwingGetter = {
      get selection(): never {
        throw new Error('renamed in a future Excalidraw version');
      },
    } as unknown as ExcalidrawImperativeAPI;

    for (const api of [noGetFiles, throwingInternals, throwingGetter]) {
      expect(() => cleanProcessedImageElementsMap(api)).not.toThrow();
    }
  });
});

/**
 * Reads the *installed* `@excalidraw/excalidraw` bundle: `handleFiles` relies on
 * internals that are not part of Excalidraw's public API, so a version bump that
 * renames or removes them must fail here instead of silently degrading the
 * whiteboard to the 500ms throttled image refresh.
 */
const readInstalledExcalidrawBundle = (): string => {
  const require = createRequire(import.meta.url);
  const resolvedPath = require.resolve('@excalidraw/excalidraw');
  const candidates = [
    resolvedPath,
    resolvedPath.includes('prod')
      ? resolvedPath.replace('prod', 'dev')
      : resolvedPath.replace('dev', 'prod'),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }
    const source = readFileSync(candidate, 'utf8');
    if (source.includes('createExcalidrawAPI')) {
      return source;
    }
  }
  throw new Error(`No Excalidraw bundle exposing createExcalidrawAPI for: ${resolvedPath}`);
};

describe('@excalidraw/excalidraw contract', () => {
  const bundle = readInstalledExcalidrawBundle();

  it('still exposes selection.app.imageCache (what primeExcalidrawImageCache primes)', () => {
    // `createExcalidrawAPI()` hands out `selection` …
    expect(bundle).toMatch(
      /createExcalidrawAPI\s*\(\s*\)\s*\{[\s\S]{0,4000}?\bselection\s*:\s*this\.selection/,
    );
    // … its `AppSelection` instance keeps the `app` back reference we follow …
    expect(bundle).toMatch(
      /constructor\(\w+\)\s*\{\s*this\.app\s*=\s*\w+;[\s\S]{0,600}?["']select["']/,
    );
    // … and `App` still owns `imageCache` as a `Map`.
    expect(bundle).toMatch(/imageCache["']?\s*,\s*(?:\/\*[\s\S]*?\*\/\s*)?new Map\b/);
  });

  it('keeps the public addFiles decode pass the fallback path relies on', () => {
    // `if (!primed) excalidrawAPI.addFiles([])` only helps because `addFiles`
    // internally triggers `addNewImagesToImageCache()`.
    expect(bundle).toMatch(/addFiles\s*:\s*this\.addFiles/);
    expect(bundle).toContain('addNewImagesToImageCache');
  });
});
