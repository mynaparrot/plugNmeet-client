import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  UploadedFileMergeReqSchema,
  UploadedFileResSchema,
} from 'plugnmeet-protocol-js';
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
import { exportToBlob, MIME_TYPES } from '@excalidraw/excalidraw';

// @ts-expect-error not an error
import ExportWorkerUrl from './exportPdf.worker?worker&url';

import { DB_STORE_NAMES, idbGet } from '../../../helpers/libs/idb';
import {
  A4_BOUNDARY_GUIDE_ID,
  formatStorageKey,
  getPageBoundaryMetrics,
  prepareA4BoundaryGuide,
  ResolvedPageInfo,
  resolvePageInfoFromElements,
} from '../helpers/utils';
import {
  getImageData,
  getOfficePageInfo,
  ImageCustomData,
} from '../helpers/handleFiles';
import { SCALE, WorkerInput, WorkerMessage } from './types';
import { CorsWorker } from '../../../helpers/libs/corsWorker';
import i18n from '../../../helpers/i18n';
import { store } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { getConfigValue } from '../../../helpers/utils';

export interface ExportParams {
  fileId: string;
  fileName: string;
  pages: number[];
  excalidrawAPI: ExcalidrawImperativeAPI;
}

class ExportPdfService {
  private readonly uploadUrl: string;
  private _isExporting = false;

  constructor() {
    const rootUrl = getConfigValue<string>(
      'serverUrl',
      'http://localhost:8080',
      'PLUG_N_MEET_SERVER_URL',
    );
    this.uploadUrl = `${rootUrl}/api/whiteboard/pdf-export/upload`;
  }

  public get isExporting() {
    return this._isExporting;
  }

  public async export(params: ExportParams) {
    if (this._isExporting) {
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

    this._isExporting = true;
    const toastId = toast.loading(i18n.t('whiteboard.export-pdf-starting'), {
      progress: 0,
      autoClose: false,
      closeButton: false,
    });

    const exportId = `export-pdf-${params.fileId}`;
    const authToken = store.getState().session.token;

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

        const pageInfo = await this.resolvePageInfo(
          params.fileId,
          pageNumber,
          elements,
        );

        // Full page frame (including edge margin), not just the drawable guide.
        // This restores left/top padding in the exported PDF slices.
        const pageFrame = this.prepareExportPageFrame(pageInfo);

        const pageImageBitmap = await this.createPageImage(
          [pageFrame, ...elements],
          files,
          appState,
          pageInfo,
        );

        await this.runExportWorker(
          toastId,
          pageImageBitmap,
          params.fileId,
          params.fileName,
          totalPagesToExport,
          pageNumber,
          pageInfo,
          appState,
          exportId,
          authToken,
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
      setTimeout(() => toast.dismiss(toastId), 300);

      const finalizingToastId = toast.loading(
        i18n.t('whiteboard.export-pdf-finalizing'),
        {
          type: 'info',
        },
      );

      const mergeReq = create(UploadedFileMergeReqSchema, {
        resumableIdentifier: exportId,
        resumableFilename: params.fileName,
        resumableTotalChunks: totalPagesToExport,
      });
      const body = toBinary(UploadedFileMergeReqSchema, mergeReq);

      // Send merge request
      const mergeResponse = await sendAPIRequest(
        '/whiteboard/pdf-export/merge',
        body,
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(
        UploadedFileResSchema,
        new Uint8Array(mergeResponse),
      );

      if (res.status && res.filePath && res.fileName) {
        toast.update(finalizingToastId, {
          render: i18n.t('whiteboard.export-pdf-finished'),
          type: 'success',
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        const errorMessage = i18n.t(
          res.msg || 'notifications.file-merge-failed',
        );
        toast.update(finalizingToastId, {
          render: errorMessage,
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
      }
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
      this._isExporting = false;
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

    const pageElements = elements.filter(
      (el) => !el.isDeleted && el.id !== A4_BOUNDARY_GUIDE_ID,
    );

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

  private async resolvePageInfo(
    fileId: string,
    pageNumber: number,
    elements: ExcalidrawElement[],
  ): Promise<ResolvedPageInfo> {
    // Prefer page info stamped when the office page image was placed.
    const fromElements = resolvePageInfoFromElements(elements);
    if (fromElements.pageWidth && fromElements.pageHeight) {
      return fromElements;
    }

    // Otherwise always load page_N_meta.json for this office page.
    const whiteboard = store.getState().whiteboard;
    const officeFile = whiteboard.whiteboardUploadedOfficeFiles.find(
      (f) => f.fileId === fileId,
    );
    if (officeFile?.pageFiles) {
      return getOfficePageInfo(pageNumber, officeFile.pageFiles);
    }

    if (fileId === whiteboard.currentWhiteboardOfficeFileId) {
      return getOfficePageInfo(pageNumber, whiteboard.currentOfficeFilePages);
    }

    return fromElements;
  }

  /**
   * Transparent full-page rect used only during export so the bitmap matches
   * slice size and keeps equal edge margin around the drawable area.
   */
  private prepareExportPageFrame(
    pageInfo: ResolvedPageInfo,
  ): ExcalidrawElement {
    const { pageWidth, pageHeight, pageStartX, pageStartY } =
      getPageBoundaryMetrics(
        pageInfo.orientation,
        pageInfo.pageWidth,
        pageInfo.pageHeight,
      );
    const reference = prepareA4BoundaryGuide(
      pageInfo.orientation,
      pageInfo.pageWidth,
      pageInfo.pageHeight,
    )[0];

    return {
      ...reference,
      x: pageStartX,
      y: pageStartY,
      width: pageWidth,
      height: pageHeight,
      strokeColor: 'transparent',
      backgroundColor: 'transparent',
    } as ExcalidrawElement;
  }

  private async createPageImage(
    elements: ExcalidrawElement[],
    files: Record<string, BinaryFileData>,
    appState: AppState,
    pageInfo: ResolvedPageInfo,
  ): Promise<ImageBitmap> {
    const {
      pageWidth: targetWidth,
      pageHeight: targetHeight,
      pageStartX: boundaryStartX,
      pageStartY: boundaryStartY,
    } = getPageBoundaryMetrics(
      pageInfo.orientation,
      pageInfo.pageWidth,
      pageInfo.pageHeight,
    );

    // 1. Scan and gather limits in a single loop pass to keep search O(N)
    let startX = boundaryStartX;
    let startY = boundaryStartY;

    const nonDeletedElms = elements.filter((el) => {
      if (el.id === A4_BOUNDARY_GUIDE_ID) {
        startX = el.x;
        startY = el.y;
        return false;
      }
      return !el.isDeleted;
    });

    // 2. Find the absolute physical limits of all elements on the canvas
    let minX = startX;
    let minY = startY;
    let maxX = startX + targetWidth;
    let maxY = startY + targetHeight;

    nonDeletedElms.forEach((el) => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    });

    // 3. Full A4 page minimum; expand only if content spills past the page frame
    const exportWidth = Math.max(targetWidth, maxX - startX);
    const exportHeight = Math.max(targetHeight, maxY - startY);

    const blob = await exportToBlob({
      elements,
      appState: {
        ...appState,
        exportBackground: true,
      },
      files,
      mimeType: MIME_TYPES.png,
      exportPadding: 0,
      getDimensions: () => ({
        width: exportWidth * SCALE,
        height: exportHeight * SCALE,
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
    totalPagesToExport: number,
    pageNumber: number,
    pageInfo: ResolvedPageInfo,
    appState: AppState,
    exportId: string,
    authToken: string,
  ) {
    const worker = await CorsWorker.create(ExportWorkerUrl);

    return new Promise<void>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;
        if (type === 'progress') {
          const baseProgress = (pageNumber - 1) / totalPagesToExport;
          const pageProgress =
            (payload.currentPage / payload.totalPages) *
            (1 / totalPagesToExport);
          const progress = baseProgress + pageProgress;

          toast.update(toastId, {
            render: i18n.t('whiteboard.export-pdf-processing-page', {
              page: payload.pageNumber,
              slice: payload.currentPage,
              totalSlices: payload.totalPages,
            }),
            progress: progress,
          });
        } else if (type === 'complete') {
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
        pageOrientation: pageInfo.orientation,
        pageWidth: pageInfo.pageWidth,
        pageHeight: pageInfo.pageHeight,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
        },
        exportId,
        authToken,
        uploadUrl: this.uploadUrl,
      };

      worker.postMessage(workerInput, [workerInput.pageImageBitmap]);
    });
  }
}

export const exportPdfService = new ExportPdfService();
