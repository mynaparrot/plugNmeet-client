export type PdfQuality = 'small' | 'normal' | 'high';

// Which set of pages the user wants to export.
//  - current: only the page currently visible on screen (live scene).
//  - selected: a user-picked subset of pages.
//  - all: every page of the current file (1..totalPages).
//  - content: only pages that have locally-available content.
export type PdfExportMode = 'current' | 'selected' | 'all' | 'content';

// Controls how pages are scaled relative to each other in a multi-page export.
//  - consistent: every page is rendered using one shared scene frame (the union
//    of all exported pages' content bounds) so a small amount of content on one
//    page is NOT zoomed up relative to a busy page. Default for multi-page modes.
//  - fit-each: each page is fitted to its own content bounds (legacy behaviour).
//    Used for single-page "current" exports where there is nothing to align to.
export type PdfExportLayout = 'consistent' | 'fit-each';

export interface PdfExportMetadata {
  roomId?: string;
  pages: number[];
  createdAt: string;
  quality: PdfQuality;
}

export interface PdfExportResult {
  blob: Blob;
  filename: string;
  metadata: PdfExportMetadata;
  // Non-fatal warnings surfaced to the user (e.g. the shared export frame grew
  // unusually large because one page has content far from the others).
  warnings?: PdfExportWarning[];
}

export type PdfExportWarning = 'large-frame';

export type PdfExportStatus = 'idle' | 'exporting' | 'done' | 'error';

// Describes a single whiteboard page for the selection UI.
export interface PdfPageInfo {
  page: number;
  // True when content is locally available (live scene or saved in IndexedDB).
  hasContent: boolean;
  // True for the page currently open in the editor.
  isCurrent: boolean;
}

// Emitted while a multi-page export runs so the UI can show progress.
export interface PdfExportProgress {
  // Number of pages processed so far (1-based once the first finishes).
  current: number;
  // Total number of pages that will be processed.
  total: number;
  // The page number currently being rendered.
  page: number;
}

// Maps the user-facing quality option to a render scale used by Excalidraw's
// export helper. Higher scale = sharper image + larger file.
export const PDF_QUALITY_SCALE: Record<PdfQuality, number> = {
  small: 1,
  normal: 2,
  high: 3,
};

// Safety limits for multi-page export.
// Warn the user before exporting more than this many pages at once.
export const PDF_MAX_PAGES_WARNING = 30;
// Abort a single page render if it takes longer than this (ms).
export const PDF_PER_PAGE_TIMEOUT_MS = 30_000;
// Refuse to build a PDF larger than this (bytes) to avoid crashing the tab.
export const PDF_MAX_BYTES = 250 * 1024 * 1024;
