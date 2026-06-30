import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { BinaryFiles } from '@excalidraw/excalidraw/types';
import {
  ExcalidrawElement,
  OrderedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';

import { DB_STORE_NAMES, idbGet } from '../../../helpers/libs/idb';
import { resolveImageFilesForElements } from '../helpers/handleFiles';
import { formatStorageKey } from '../helpers/utils';
import { PdfPageInfo } from './types';

interface PageSourceParams {
  excalidrawAPI: ExcalidrawImperativeAPI;
  currentPage: number;
  fileId?: string;
}

export interface PageContent {
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
}

/**
 * Returns the elements and the image files for a single whiteboard page.
 *
 * The page currently open in the editor is read from the live Excalidraw scene
 * (it may not be persisted to IndexedDB yet). Every other page is read from the
 * existing whiteboard IndexedDB storage, one page at a time, so we never hold
 * the whole document in memory.
 *
 * Image binaries are resolved through the whiteboard persistence layer
 * (IndexedDB image cache with a network fallback) so images render reliably
 * even on pages other than the one currently open. For the current page we also
 * merge in the live scene's already-loaded files.
 */
export const getPage = async ({
  excalidrawAPI,
  currentPage,
  fileId,
  page,
}: PageSourceParams & { page: number }): Promise<PageContent> => {
  const elements =
    page === currentPage
      ? // Live scene, excluding deleted elements.
        excalidrawAPI.getSceneElements()
      : ((await idbGet<readonly OrderedExcalidrawElement[]>(
          DB_STORE_NAMES.WHITEBOARD,
          formatStorageKey(page, fileId),
        )) ?? []);

  const resolvedFiles = await resolveImageFilesForElements(elements);
  const files: BinaryFiles =
    page === currentPage
      ? { ...resolvedFiles, ...excalidrawAPI.getFiles() }
      : resolvedFiles;

  return { elements, files };
};

/**
 * Probes pages 1..totalPages and reports which ones have locally-available
 * content. The current page is always evaluated from the live scene; the rest
 * are read from IndexedDB. Pages are probed sequentially to avoid loading the
 * whole document at once.
 *
 * Note: non-current pages are only detectable here if they were previously
 * visited/synced and saved locally. Pages that were never opened (common for
 * non-presenters) will report `hasContent: false` even if the presenter drew
 * on them.
 */
export const collectPageInfos = async ({
  excalidrawAPI,
  currentPage,
  totalPages,
  fileId,
}: PageSourceParams & { totalPages: number }): Promise<PdfPageInfo[]> => {
  const infos: PdfPageInfo[] = [];
  for (let page = 1; page <= totalPages; page += 1) {
    const isCurrent = page === currentPage;
    let hasContent: boolean;
    if (isCurrent) {
      hasContent = excalidrawAPI.getSceneElements().length > 0;
    } else {
      const stored = await idbGet<readonly OrderedExcalidrawElement[]>(
        DB_STORE_NAMES.WHITEBOARD,
        formatStorageKey(page, fileId),
      );
      hasContent = !!stored && stored.length > 0;
    }
    infos.push({ page, hasContent, isCurrent });
  }
  return infos;
};
