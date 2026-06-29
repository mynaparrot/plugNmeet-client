export type PdfQuality = 'small' | 'normal' | 'high';

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
}

export type PdfExportStatus = 'idle' | 'exporting' | 'done' | 'error';

// Maps the user-facing quality option to a render scale used by Excalidraw's
// export helper. Higher scale = sharper image + larger file.
export const PDF_QUALITY_SCALE: Record<PdfQuality, number> = {
  small: 1,
  normal: 2,
  high: 3,
};
