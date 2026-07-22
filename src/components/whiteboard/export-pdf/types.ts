// These types are shared between the main thread and the web worker.

// Virtual coordinate viewport reference used for absolute element positioning
export const VIRTUAL_WORKSPACE_WIDTH = 1160;
export const VIRTUAL_WORKSPACE_HEIGHT = 260;

// Standard A4 dimensions at 150 DPI (portrait: width x height)
export const DEFAULT_A4_WIDTH = 1240;
export const DEFAULT_A4_HEIGHT = 1754;
export const DEFAULT_A4_MARGIN = 40;
export const A4_VIEWPORT_PADDING_LEFT = 20;
export const A4_VIEWPORT_PADDING_TOP = 50;

export const SCALE = 2;

export type PageOrientation = 'portrait' | 'landscape';

export const DEFAULT_PAGE_ORIENTATION: PageOrientation = 'portrait';

export interface PageSize {
  width: number;
  height: number;
}

/**
 * Server renders page PNGs at 300 DPI (`mutool -r 300`);
 * logical whiteboard units are 150 DPI. So logical = pixels / 2.
 * A4 PNG 2480x3508 -> 1240x1754 (identical to the A4 constants).
 */
export const PAGE_PIXELS_TO_LOGICAL = 2;

/** Convert rendered page pixels (from page_N_meta.json) to logical page size. */
export const pageSizeFromMetaPixels = (
  pixelWidth?: number,
  pixelHeight?: number,
): PageSize | null => {
  if (!pixelWidth || !pixelHeight || pixelWidth <= 0 || pixelHeight <= 0) {
    return null;
  }
  return {
    width: Math.max(1, Math.round(pixelWidth / PAGE_PIXELS_TO_LOGICAL)),
    height: Math.max(1, Math.round(pixelHeight / PAGE_PIXELS_TO_LOGICAL)),
  };
};

/** Logical A4 page size (pre-scale) for the given orientation. */
export const getPageSize = (
  orientation: PageOrientation = DEFAULT_PAGE_ORIENTATION,
): PageSize => {
  if (orientation === 'landscape') {
    // will be flipped
    return {
      width: DEFAULT_A4_HEIGHT,
      height: DEFAULT_A4_WIDTH,
    };
  }
  return {
    width: DEFAULT_A4_WIDTH,
    height: DEFAULT_A4_HEIGHT,
  };
};

/** Export-time pixel size (logical size * SCALE). */
export const getExportPageSize = (
  orientation: PageOrientation = DEFAULT_PAGE_ORIENTATION,
): PageSize => {
  const size = getPageSize(orientation);
  return {
    width: size.width * SCALE,
    height: size.height * SCALE,
  };
};

export const resolvePageOrientation = (
  value?: string | null,
): PageOrientation => {
  return value === 'landscape' ? 'landscape' : 'portrait';
};

// Message sent from the main thread to the worker
export interface WorkerInput {
  pageImageBitmap: ImageBitmap;
  fileId: string;
  fileName: string;
  pageNumber: number;
  pageOrientation: PageOrientation;
  /** Logical page size (pre-SCALE) for slicing. Falls back to A4 by orientation if absent. */
  pageWidth?: number;
  pageHeight?: number;
  appState: {
    viewBackgroundColor: string;
  };
  exportId: string;
  authToken: string;
  uploadUrl: string;
}

// Messages sent from the worker back to the main thread
export type WorkerMessage =
  | {
      type: 'progress';
      payload: {
        currentPage: number; // Current slice number being processed by the worker
        totalPages: number; // Total slices for the current page
        pageNumber: number; // The original page number this worker is handling
      };
    }
  | {
      type: 'complete';
      payload: {
        pageNumber: number; // The original page number this worker has completed
      };
    }
  | {
      type: 'error';
      payload: string;
    };
