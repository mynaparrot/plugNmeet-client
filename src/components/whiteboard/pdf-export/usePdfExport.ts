import { useCallback, useState } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

import { exportCurrentPageToPdf, triggerDownload } from '../helpers/exportPdf';
import { ensureAllImagesDataIsLoaded } from '../helpers/utils';
import { PdfExportStatus, PdfQuality } from './types';

interface UsePdfExportParams {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  roomId?: string;
  currentPage: number;
}

interface UsePdfExportReturn {
  status: PdfExportStatus;
  error: string | null;
  exportCurrentPage: (quality: PdfQuality) => Promise<void>;
  reset: () => void;
}

/**
 * Handles client-side PDF export of the currently visible whiteboard page.
 * Keeps all generation logic out of the whiteboard component.
 */
const usePdfExport = ({
  excalidrawAPI,
  roomId,
  currentPage,
}: UsePdfExportParams): UsePdfExportReturn => {
  const [status, setStatus] = useState<PdfExportStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  const exportCurrentPage = useCallback(
    async (quality: PdfQuality) => {
      if (!excalidrawAPI) {
        return;
      }
      setStatus('exporting');
      setError(null);
      try {
        // Prefer non-deleted elements only.
        const elements = excalidrawAPI.getSceneElements();
        const files = excalidrawAPI.getFiles();
        // Make sure image binary data is available before rendering.
        ensureAllImagesDataIsLoaded(excalidrawAPI, elements);

        const { blob, filename } = await exportCurrentPageToPdf({
          elements,
          appState: excalidrawAPI.getAppState(),
          files,
          quality,
          page: currentPage,
          roomId,
        });

        triggerDownload(blob, filename);
        setStatus('done');
      } catch (e) {
        console.error('PDF export failed:', e);
        setError(e instanceof Error ? e.message : 'unknown');
        setStatus('error');
      }
    },
    [excalidrawAPI, roomId, currentPage],
  );

  return { status, error, exportCurrentPage, reset };
};

export default usePdfExport;
