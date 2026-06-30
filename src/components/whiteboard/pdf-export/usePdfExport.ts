import { useCallback, useRef, useState } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { exportPagesToPdf, triggerDownload } from '../helpers/exportPdf';
import { collectPageInfos, getPage } from './pageSource';
import {
  PdfExportMode,
  PdfExportProgress,
  PdfExportStatus,
  PdfPageInfo,
  PdfQuality,
} from './types';

interface UsePdfExportParams {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  roomId?: string;
  currentPage: number;
  totalPages: number;
  fileId?: string;
}

interface ExportPagesArgs {
  mode: PdfExportMode;
  quality: PdfQuality;
  // Pages chosen by the user; only used when mode === 'selected'.
  selectedPages?: number[];
}

interface UsePdfExportReturn {
  status: PdfExportStatus;
  error: string | null;
  progress: PdfExportProgress | null;
  exportPages: (args: ExportPagesArgs) => Promise<void>;
  loadPageInfos: () => Promise<PdfPageInfo[]>;
  cancel: () => void;
  reset: () => void;
}

/**
 * Handles client-side PDF export of one or more whiteboard pages. All
 * generation logic lives in the helpers; this hook only orchestrates state,
 * page selection, progress and cancellation.
 */
const usePdfExport = ({
  excalidrawAPI,
  roomId,
  currentPage,
  totalPages,
  fileId,
}: UsePdfExportParams): UsePdfExportReturn => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PdfExportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<PdfExportProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
    setError(null);
    setProgress(null);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Enumerates pages and reports which ones have locally-available content.
  const loadPageInfos = useCallback(async (): Promise<PdfPageInfo[]> => {
    if (!excalidrawAPI) {
      return [];
    }
    return collectPageInfos({
      excalidrawAPI,
      currentPage,
      totalPages,
      fileId,
    });
  }, [excalidrawAPI, currentPage, totalPages, fileId]);

  // Resolves the ordered list of pages to export for a given mode.
  const resolvePages = useCallback(
    async (
      mode: PdfExportMode,
      selectedPages?: number[],
    ): Promise<number[]> => {
      switch (mode) {
        case 'current':
          return [currentPage];
        case 'selected':
          return (selectedPages ?? [])
            .filter((p) => p >= 1 && p <= totalPages)
            .sort((a, b) => a - b);
        case 'all':
          return Array.from({ length: totalPages }, (_, i) => i + 1);
        case 'content': {
          const infos = await loadPageInfos();
          return infos.filter((p) => p.hasContent).map((p) => p.page);
        }
        default:
          return [];
      }
    },
    [currentPage, totalPages, loadPageInfos],
  );

  const exportPages = useCallback(
    async ({ mode, quality, selectedPages }: ExportPagesArgs) => {
      // Refuse to start a second export while one is already running. The lock
      // is claimed synchronously (before any await) so rapid repeat triggers
      // cannot start overlapping exports or emit duplicate notifications.
      if (!excalidrawAPI || abortRef.current) {
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const pages = await resolvePages(mode, selectedPages);
        if (!pages.length) {
          setError('empty-page');
          setStatus('error');
          return;
        }

        setStatus('exporting');
        setError(null);
        setProgress({ current: 0, total: pages.length, page: pages[0] });

        // Only the "current" and "content" modes drop empty pages. The "all"
        // and "selected" modes include empty pages as blank pages so the page
        // numbering is preserved and nothing is silently omitted.
        const skipEmptyPages = mode === 'current' || mode === 'content';

        // Single-page "current" exports have nothing to align to, so they keep
        // the legacy fit-to-content behaviour. Every multi-page mode uses one
        // shared frame so pages keep a consistent scale relative to each other.
        const layout = mode === 'current' ? 'fit-each' : 'consistent';

        const { blob, filename, warnings } = await exportPagesToPdf({
          pages,
          getPage: (page) =>
            getPage({ excalidrawAPI, currentPage, fileId, page }),
          appState: excalidrawAPI.getAppState(),
          quality,
          roomId,
          layout,
          skipEmptyPages,
          signal: controller.signal,
          onProgress: setProgress,
        });

        triggerDownload(blob, filename);
        setStatus('done');
        // Fire the success toast imperatively here, exactly once per completed
        // export. Keeping it out of a React effect avoids duplicate toasts
        // caused by re-renders or React Strict Mode's double-invoked effects.
        toast(t('whiteboard.export-pdf-success'), { type: 'success' });
        // Non-fatal heads-up: the shared frame grew unusually large, usually
        // because one page has a stray mark far from the rest of the content.
        if (warnings?.includes('large-frame')) {
          toast(t('whiteboard.export-pdf-large-frame-warning'), {
            type: 'warning',
          });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'unknown';
        if (message === 'cancelled') {
          setStatus('idle');
          setError(null);
          setProgress(null);
        } else if (message === 'empty-page') {
          // Expected, benign case: skipping empty pages left nothing to
          // export. Surface the inline message via state without logging an
          // error or treating it as a failure.
          setError('empty-page');
          setStatus('error');
        } else {
          console.error('PDF export failed:', e);
          setError(message);
          setStatus('error');
          // One generic error toast per failed export, fired imperatively.
          toast(t('whiteboard.export-pdf-error'), { type: 'error' });
        }
      } finally {
        abortRef.current = null;
      }
    },
    [excalidrawAPI, roomId, currentPage, fileId, resolvePages, t],
  );

  return {
    status,
    error,
    progress,
    exportPages,
    loadPageInfos,
    cancel,
    reset,
  };
};

export default usePdfExport;
