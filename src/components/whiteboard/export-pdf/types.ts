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
