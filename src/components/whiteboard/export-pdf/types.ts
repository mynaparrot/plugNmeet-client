// These types are shared between the main thread and the web worker.

// Standard A4 dimensions at 150 DPI
export const DEFAULT_A4_WIDTH = 1240;
export const DEFAULT_A4_HEIGHT = 1754;

export const SCALE = 2;
export const A4_WIDTH = DEFAULT_A4_WIDTH * SCALE;
export const A4_HEIGHT = DEFAULT_A4_HEIGHT * SCALE;

// Message sent from the main thread to the worker
export interface WorkerInput {
  pageImageBitmap: ImageBitmap;
  fileId: string;
  fileName: string;
  pageNumber: number;
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
