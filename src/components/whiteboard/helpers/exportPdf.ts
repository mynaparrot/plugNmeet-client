import { exportToBlob } from '@excalidraw/excalidraw';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import {
  PdfExportMetadata,
  PdfExportResult,
  PdfQuality,
  PDF_QUALITY_SCALE,
} from '../pdf-export/types';

export interface ExportCurrentPageParams {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  quality: PdfQuality;
  page: number;
  roomId?: string;
}

/**
 * Converts a single rendered whiteboard page into a one-page PDF, entirely in
 * the browser. The PDF library (jsPDF) is loaded dynamically so it is excluded
 * from the initial client bundle and only fetched when the user exports.
 */
export const exportCurrentPageToPdf = async ({
  elements,
  appState,
  files,
  quality,
  page,
  roomId,
}: ExportCurrentPageParams): Promise<PdfExportResult> => {
  if (!elements.length) {
    throw new Error('empty-page');
  }

  const scale = PDF_QUALITY_SCALE[quality];

  // Render the current page to a PNG blob using Excalidraw's own exporter.
  const imageBlob = await exportToBlob({
    elements,
    files,
    mimeType: 'image/png',
    appState: {
      ...appState,
      exportBackground: true,
      exportWithDarkMode: false,
    },
    getDimensions: (width, height) => ({
      width: width * scale,
      height: height * scale,
      scale,
    }),
  });

  const { dataUrl, width, height } = await blobToImage(imageBlob);

  // Dynamic import keeps jsPDF out of the initial bundle.
  const { jsPDF } = await import('jspdf');
  const orientation = width >= height ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'px',
    format: [width, height],
    compress: true,
  });
  doc.addImage(dataUrl, 'PNG', 0, 0, width, height);

  const blob = doc.output('blob');
  const metadata: PdfExportMetadata = {
    roomId,
    pages: [page],
    createdAt: new Date().toISOString(),
    quality,
  };
  const filename = buildFilename(roomId);

  return { blob, filename, metadata };
};

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
