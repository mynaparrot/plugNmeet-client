import {
  convertToExcalidrawElements,
  exportToBlob,
  getCommonBounds,
} from '@excalidraw/excalidraw';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import {
  PdfExportLayout,
  PdfExportMetadata,
  PdfExportProgress,
  PdfExportResult,
  PdfExportWarning,
  PdfQuality,
  PDF_MAX_BYTES,
  PDF_PER_PAGE_TIMEOUT_MS,
  PDF_QUALITY_SCALE,
} from '../pdf-export/types';

export interface ExportPagesParams {
  // Ordered list of page numbers to export.
  pages: number[];
  // Lazily resolves the elements and image files for a single page. Called one
  // page at a time so the whole document is never held in memory simultaneously.
  getPage: (
    page: number,
  ) => Promise<{ elements: readonly ExcalidrawElement[]; files: BinaryFiles }>;
  appState: Partial<AppState>;
  quality: PdfQuality;
  roomId?: string;
  // Scaling strategy across pages. 'consistent' renders every page with one
  // shared scene frame so relative sizes are preserved; 'fit-each' fits each
  // page to its own content (legacy). Defaults to 'fit-each'.
  layout?: PdfExportLayout;
  // When true, empty pages are omitted from the PDF. When false (the default),
  // empty pages are included as blank pages so the page numbering is preserved.
  skipEmptyPages?: boolean;
  onProgress?: (progress: PdfExportProgress) => void;
  signal?: AbortSignal;
  perPageTimeoutMs?: number;
}

// Fallback page size (A4 portrait at ~96dpi) used only when the very first
// page of the document is blank and we have no rendered page to copy from.
const DEFAULT_BLANK_PAGE = { width: 794, height: 1123 };

// A rectangular region in scene coordinates. In consistent layout this frame is
// the union of every exported page's content bounds plus padding, and it is
// reused for every page so the scene-to-pixel scale is identical throughout.
interface CommonFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Result of the consistent-layout pre-pass.
interface FramePlan {
  // The shared frame, or null when no exported page had any content.
  frame: CommonFrame | null;
  // True when the shared frame is much larger than the biggest single page,
  // which usually means a stray mark sits far from the real content.
  oversized: boolean;
  // Resolved page contents, cached so the render pass does not re-read them.
  contents: Map<number, PageContentLite>;
}

interface PageContentLite {
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
}

// Padding added around the shared content frame, and the matching Excalidraw
// export padding. Kept at 0 export padding so the rendered region exactly
// equals the (already padded) frame, making blank-page sizing deterministic.
const CONSISTENT_FRAME_PADDING = 24;
// A page's content frame larger than this multiple of the biggest single page
// triggers the "unusually large frame" warning.
const OVERSIZED_FRAME_FACTOR = 3;
// Upper bound (in scene units) for either shared-frame dimension before scaling
// is reduced. Excalidraw renders a little larger than the raw frame, so this is
// kept well under the browser canvas (~16k) and jsPDF page (14400) hard limits.
const MAX_RENDER_DIMENSION = 10000;

/**
 * Builds a multi-page PDF from a list of whiteboard pages, entirely in the
 * browser. Pages are rendered strictly one at a time and added to the document
 * immediately, so only a single page image lives in memory at any moment.
 *
 * The PDF library (jsPDF) is loaded dynamically so it stays out of the initial
 * client bundle and is only fetched when the user actually exports.
 *
 * With `layout: 'consistent'` (recommended for multi-page exports) a pre-pass
 * computes one shared scene frame from the union of every page's content
 * bounds, and every page is rendered with that same frame so a sparse page is
 * never zoomed up relative to a busy one. With `layout: 'fit-each'` (legacy)
 * each page is fitted to its own content.
 *
 * Empty pages are included as blank pages unless `skipEmptyPages` is set, in
 * which case they are omitted entirely. Supports cancellation via
 * {@link AbortSignal}, per-page timeouts and an overall output size guard.
 */
export const exportPagesToPdf = async ({
  pages,
  getPage,
  appState,
  quality,
  roomId,
  layout = 'fit-each',
  skipEmptyPages = false,
  onProgress,
  signal,
  perPageTimeoutMs = PDF_PER_PAGE_TIMEOUT_MS,
}: ExportPagesParams): Promise<PdfExportResult> => {
  if (!pages.length) {
    throw new Error('empty-page');
  }

  const scale = PDF_QUALITY_SCALE[quality];
  const useConsistent = layout === 'consistent';

  // Consistent layout needs a shared frame, computed up front from every page's
  // geometry. The resolved page contents are cached here so the render pass
  // below does not have to read them from storage a second time.
  let frame: CommonFrame | null = null;
  let oversized = false;
  let cached: Map<number, PageContentLite> | null = null;
  if (useConsistent) {
    const plan = await computeFramePlan({ pages, getPage, signal });
    frame = plan.frame;
    oversized = plan.oversized;
    cached = plan.contents;
  }

  // In consistent layout the shared frame is rendered at `scale`, but a frame
  // inflated by a stray, far-away mark could exceed the browser's max canvas
  // size and fail outright. Clamp the scale so the export still succeeds
  // (zoomed out) and let the oversized warning explain why.
  const frameScale =
    useConsistent && frame
      ? Math.min(
          scale,
          MAX_RENDER_DIMENSION / frame.width,
          MAX_RENDER_DIMENSION / frame.height,
        )
      : scale;
  const resolvePage = (page: number): Promise<PageContentLite> => {
    const hit = cached?.get(page);
    return hit ? Promise.resolve(hit) : getPage(page);
  };

  // Dynamic import keeps jsPDF out of the initial bundle.
  const { jsPDF } = await import('jspdf');
  let doc: import('jspdf').jsPDF | null = null;
  const exportedPages: number[] = [];
  // Dimensions of the most recently added page, reused to size blank pages so
  // a blank page matches the surrounding content.
  let lastDims = DEFAULT_BLANK_PAGE;
  // In consistent layout every page shares one size. Blank pages reuse the exact
  // pixel size of the first rendered content page (so they match precisely);
  // until a content page has rendered, fall back to the computed frame size.
  const computedConsistentDims =
    useConsistent && frame
      ? { width: frame.width * frameScale, height: frame.height * frameScale }
      : null;
  let renderedConsistentDims: { width: number; height: number } | null = null;

  const addPageToDoc = (
    width: number,
    height: number,
    draw?: (doc: import('jspdf').jsPDF) => void,
  ) => {
    const orientation = width >= height ? 'landscape' : 'portrait';
    if (!doc) {
      doc = new jsPDF({
        orientation,
        unit: 'px',
        format: [width, height],
        compress: true,
      });
    } else {
      doc.addPage([width, height], orientation);
    }
    draw?.(doc);
    lastDims = { width, height };
  };

  for (let i = 0; i < pages.length; i += 1) {
    throwIfAborted(signal);
    const page = pages[i];
    onProgress?.({ current: i, total: pages.length, page });

    // Resolve this page's elements and files only when ready to render it (or
    // reuse the cached copy from the consistent-layout pre-pass).
    const { elements, files } = await resolvePage(page);

    if (!elements.length) {
      if (skipEmptyPages) {
        // Content-only / current modes drop empty pages entirely.
        continue;
      }
      // Include the empty page as a blank page. In consistent layout it matches
      // the shared frame (preferring the first rendered content page's exact
      // size); otherwise it matches the previous page's size (or a sensible
      // default for a leading blank page).
      const blank =
        renderedConsistentDims ?? computedConsistentDims ?? lastDims;
      addPageToDoc(blank.width, blank.height);
      exportedPages.push(page);
      continue;
    }

    // In consistent layout, pin an invisible anchor spanning the shared frame so
    // Excalidraw computes the same export region (and thus the same scale) for
    // every page.
    const renderElements =
      useConsistent && frame
        ? [...elements, buildFrameAnchor(frame)]
        : elements;

    const image = await withTimeoutAndAbort(
      renderElementsToImage({
        elements: renderElements,
        appState,
        files,
        scale: frameScale,
        // 0 padding makes the rendered region exactly equal the (already
        // padded) shared frame, so blank pages can match it precisely.
        exportPadding: useConsistent && frame ? 0 : undefined,
      }),
      perPageTimeoutMs,
      signal,
    );
    throwIfAborted(signal);

    if (useConsistent && frame) {
      // Every consistent-layout content page renders to the same size; remember
      // it so any blank pages can match it exactly.
      renderedConsistentDims = { width: image.width, height: image.height };
    }

    addPageToDoc(image.width, image.height, (d) =>
      d.addImage(image.dataUrl, 'PNG', 0, 0, image.width, image.height),
    );
    exportedPages.push(page);
    // `image` goes out of scope on the next iteration, keeping memory bounded.
  }

  if (!doc) {
    // Nothing had any content (only possible when skipping empty pages).
    throw new Error('empty-page');
  }

  const blob = (doc as import('jspdf').jsPDF).output('blob');
  if (blob.size > PDF_MAX_BYTES) {
    throw new Error('too-large');
  }

  onProgress?.({
    current: pages.length,
    total: pages.length,
    page: pages[pages.length - 1],
  });

  const metadata: PdfExportMetadata = {
    roomId,
    pages: exportedPages,
    createdAt: new Date().toISOString(),
    quality,
  };

  const warnings: PdfExportWarning[] | undefined = oversized
    ? ['large-frame']
    : undefined;

  return { blob, filename: buildFilename(roomId), metadata, warnings };
};

/**
 * Consistent-layout pre-pass: resolves every exported page once, computes the
 * union of their content bounds (using geometry, never element counts) and
 * returns one padded shared frame plus the cached page contents.
 */
const computeFramePlan = async ({
  pages,
  getPage,
  signal,
}: Pick<
  ExportPagesParams,
  'pages' | 'getPage' | 'signal'
>): Promise<FramePlan> => {
  const contents = new Map<number, PageContentLite>();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  // Track the biggest single-page content box so we can detect a frame that has
  // been inflated by a stray, far-away mark.
  let maxPageWidth = 0;
  let maxPageHeight = 0;
  let contentPages = 0;

  for (const page of pages) {
    throwIfAborted(signal);
    const content = await getPage(page);
    contents.set(page, content);
    if (!content.elements.length) {
      continue;
    }
    const [x1, y1, x2, y2] = getCommonBounds(content.elements);
    if (
      !Number.isFinite(x1) ||
      !Number.isFinite(y1) ||
      !Number.isFinite(x2) ||
      !Number.isFinite(y2)
    ) {
      continue;
    }
    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
    maxPageWidth = Math.max(maxPageWidth, x2 - x1);
    maxPageHeight = Math.max(maxPageHeight, y2 - y1);
    contentPages += 1;
  }

  if (contentPages === 0) {
    return { frame: null, oversized: false, contents };
  }

  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const frame: CommonFrame = {
    x: minX - CONSISTENT_FRAME_PADDING,
    y: minY - CONSISTENT_FRAME_PADDING,
    width: contentWidth + CONSISTENT_FRAME_PADDING * 2,
    height: contentHeight + CONSISTENT_FRAME_PADDING * 2,
  };

  // Only meaningful with at least two content pages to compare against; a frame
  // far bigger than any single page implies content sitting far away.
  const oversized =
    contentPages >= 2 &&
    (contentWidth > maxPageWidth * OVERSIZED_FRAME_FACTOR ||
      contentHeight > maxPageHeight * OVERSIZED_FRAME_FACTOR);

  return { frame, oversized, contents };
};

/**
 * Builds a fully transparent rectangle spanning the shared frame. It is
 * geometrically real (so Excalidraw sizes the export region to it) but paints
 * nothing, pinning every page to the same scene region and scale.
 */
const buildFrameAnchor = (frame: CommonFrame): ExcalidrawElement => {
  const [anchor] = convertToExcalidrawElements([
    {
      type: 'rectangle',
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      strokeColor: 'transparent',
      backgroundColor: 'transparent',
      opacity: 0,
    },
  ]);
  return anchor;
};

interface RenderImageParams {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  scale: number;
  // When set, overrides Excalidraw's export padding (scene units). Consistent
  // layout passes 0 so the rendered region equals the shared frame exactly.
  exportPadding?: number;
}

/**
 * Renders a set of elements to a PNG via Excalidraw's own exporter and decodes
 * it into a data URL plus pixel dimensions.
 */
const renderElementsToImage = async ({
  elements,
  appState,
  files,
  scale,
  exportPadding,
}: RenderImageParams) => {
  const imageBlob = await exportToBlob({
    elements,
    files,
    mimeType: 'image/png',
    appState: {
      ...appState,
      exportBackground: true,
      exportWithDarkMode: false,
      ...(exportPadding !== undefined ? { exportPadding } : {}),
    },
    getDimensions: (width, height) => ({
      width: width * scale,
      height: height * scale,
      scale,
    }),
  });

  return blobToImage(imageBlob);
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new Error('cancelled');
  }
};

/**
 * Races a promise against a timeout and an optional abort signal so a single
 * stuck page can never hang the whole export.
 */
const withTimeoutAndAbort = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      fn();
    };
    const timer = setTimeout(
      () => finish(() => reject(new Error('page-timeout'))),
      timeoutMs,
    );
    const onAbort = () => finish(() => reject(new Error('cancelled')));
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
    promise.then(
      (value) => finish(() => resolve(value)),
      (err) => finish(() => reject(err)),
    );
  });

export const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revocation so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const buildFilename = (roomId?: string) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const room = roomId ? `${roomId}-` : '';
  return `plugnmeet-whiteboard-${room}${stamp}.pdf`;
};

const blobToImage = (
  blob: Blob,
): Promise<{ dataUrl: string; width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-failed'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('decode-failed'));
      img.onload = () =>
        resolve({ dataUrl, width: img.width, height: img.height });
      img.src = dataUrl;
    };
    reader.readAsDataURL(blob);
  });
