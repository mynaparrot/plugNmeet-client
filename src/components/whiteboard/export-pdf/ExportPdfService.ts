import {
  ExcalidrawElement,
  ExcalidrawImageElement,
} from '@excalidraw/excalidraw/element/types';
import {
  AppState,
  BinaryFileData,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types';
import { toast, Id } from 'react-toastify';
import { exportToBlob } from '@excalidraw/excalidraw';
// @ts-expect-error not an error
import ExportWorkerUrl from './worker?url';

import { DB_STORE_NAMES, idbGet } from '../../../helpers/libs/idb';
import { formatStorageKey } from '../helpers/utils';
import { getImageData, ImageCustomData } from '../helpers/handleFiles';
import { WorkerInput, WorkerMessage } from './types';
import { CorsWorker } from './corsWorker';
import i18n from '../../../helpers/i18n';

const SCALE = 2;

export interface ExportParams {
  fileId: string;
  fileName: string;
  pages: number[];
  excalidrawAPI: ExcalidrawImperativeAPI;
}

class ExportPdfService {
  private isExporting = false;

  public async export(params: ExportParams) {
    if (this.isExporting) {
      toast.warn(i18n.t('whiteboard.export-pdf-progress-warning'));
      return;
    }
    if (!params.excalidrawAPI) {
      toast.error(i18n.t('whiteboard.export-pdf-api-not-ready'));
      return;
    }
    if (params.pages.length === 0) {
      toast.warn(i18n.t('whiteboard.export-pdf-no-pages-selected'));
      return;
    }

    this.isExporting = true;
    const toastId = toast.loading(i18n.t('whiteboard.export-pdf-starting'), {
      progress: 0,
      autoClose: false,
      closeButton: false,
    });

    try {
      const appState = params.excalidrawAPI.getAppState();
      let hasExportedSomething = false;
      const totalPagesToExport = params.pages.length;

      for (let i = 0; i < totalPagesToExport; i++) {
        const pageNumber = params.pages[i];
        toast.update(toastId, {
          render: i18n.t('whiteboard.export-pdf-gathering-page', {
            page: pageNumber,
            current: i + 1,
            total: totalPagesToExport,
          }),
          progress: i / totalPagesToExport,
        });

        const { elements, files } = await this.gatherPageData(
          params.fileId,
          pageNumber,
        );

        if (elements.length === 0) {
          continue; // Skip empty pages
        }
        hasExportedSomething = true;

        toast.update(toastId, {
          render: i18n.t('whiteboard.export-pdf-creating-image', {
            page: pageNumber,
          }),
        });

        const pageImageBitmap = await this.createPageImage(
          elements,
          files,
          appState,
        );

        await this.runExportWorker(
          toastId,
          pageImageBitmap,
          params.fileId,
          params.fileName,
          pageNumber,
          totalPagesToExport,
          appState,
        );
      }

      if (!hasExportedSomething) {
        toast.update(toastId, {
          render: i18n.t('whiteboard.export-pdf-no-pages-to-export'),
          type: 'info',
          isLoading: false,
          autoClose: 3000,
        });
        return;
      }

      toast.update(toastId, {
        render: i18n.t('whiteboard.export-pdf-all-pages-processed'),
        type: 'success',
        isLoading: false,
        autoClose: 3000,
        progress: 1,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : i18n.t('whiteboard.export-pdf-unknown-error');
      console.error('PDF Export failed', error);
      toast.update(toastId, {
        render: message,
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      this.isExporting = false;
    }
  }

  private async gatherPageData(
    fileId: string,
    pageNumber: number,
  ): Promise<{
    elements: ExcalidrawElement[];
    files: Record<string, BinaryFileData>;
  }> {
    const files = new Map<string, BinaryFileData>();
    const pageKey = formatStorageKey(pageNumber, fileId);
    const elements = await idbGet<ExcalidrawElement[]>(
      DB_STORE_NAMES.WHITEBOARD,
      pageKey,
    );

    if (!elements) {
      return { elements: [], files: {} };
    }

    const pageElements = elements.filter((el) => !el.isDeleted);

    for (const el of pageElements) {
      if (el.type === 'image') {
        const imageEl = el as ExcalidrawImageElement;
        const imageData = await getImageData(
          imageEl,
          imageEl.customData as ImageCustomData,
        );
        if (imageData) {
          files.set(imageData.id, imageData);
        }
      }
    }

    return { elements: pageElements, files: Object.fromEntries(files) };
  }

  private async createPageImage(
    elements: ExcalidrawElement[],
    files: Record<string, BinaryFileData>,
    appState: AppState,
  ): Promise<ImageBitmap> {
    const blob = await exportToBlob({
      elements,
      appState: {
        ...appState,
        exportBackground: true,
        viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
      },
      files,
      mimeType: 'image/png',
      getDimensions: (width: number, height: number) => ({
        width: width * SCALE,
        height: height * SCALE,
        scale: SCALE,
      }),
    });
    return await createImageBitmap(blob);
  }

  private async runExportWorker(
    toastId: Id,
    bitmap: ImageBitmap,
    fileId: string,
    fileName: string,
    pageNumber: number,
    totalPages: number,
    appState: AppState,
  ) {
    const worker = await CorsWorker.create(ExportWorkerUrl);

    return new Promise<void>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;
        if (type === 'progress') {
          const baseProgress = (pageNumber - 1) / totalPages;
          const pageProgress =
            (payload.currentPage / payload.totalPages) * (1 / totalPages);
          const progress = baseProgress + pageProgress;

          toast.update(toastId, {
            render: i18n.t('whiteboard.export-pdf-processing-page', {
              page: pageNumber,
              slice: payload.currentPage,
              totalSlices: payload.totalPages,
            }),
            progress,
          });
        } else if (type === 'complete') {
          console.log(`Worker finished page ${pageNumber}.`, payload.dataUrls);
          worker.terminate();
          resolve();
        } else if (type === 'error') {
          worker.terminate();
          reject(new Error(payload));
        }
      };

      worker.onerror = (error) => {
        console.error('Full worker error object:', error);
        const message =
          error.message || i18n.t('whiteboard.export-pdf-worker-error');
        worker.terminate();
        reject(
          new Error(
            i18n.t('whiteboard.export-pdf-worker-error-render', { message }),
          ),
        );
      };

      const workerInput: WorkerInput = {
        pageImageBitmap: bitmap,
        fileId,
        fileName,
        pageNumber,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
        },
      };

      worker.postMessage(workerInput, [workerInput.pageImageBitmap]);
    });
  }
}

export const exportPdfService = new ExportPdfService();
