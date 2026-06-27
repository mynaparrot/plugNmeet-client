// These types are shared between the main thread and the web worker.

// Message sent from the main thread to the worker
export interface WorkerInput {
  pageImageBitmap: ImageBitmap;
  fileId: string;
  fileName: string;
  pageNumber: number;
  appState: {
    viewBackgroundColor: string;
  };
}

// Messages sent from the worker back to the main thread
export type WorkerMessage =
  | {
      type: 'progress';
      payload: {
        currentPage: number;
        totalPages: number;
      };
    }
  | {
      type: 'complete';
      // Temporarily, the payload will be an array of data URLs for testing.
      // In production, it will be a single download URL.
      payload: {
        dataUrls?: string[];
        downloadUrl?: string;
      };
    }
  | {
      type: 'error';
      payload: string;
    };
