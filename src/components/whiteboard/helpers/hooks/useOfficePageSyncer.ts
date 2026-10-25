import { useCallback, useEffect } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

import { store, useAppSelector } from '../../../../store';
import { IWhiteboardFile } from '../../../../store/slices/interfaces/whiteboard';
import { fetchFileWithElm, preloadOfficeFilePages } from '../handleFiles';
import { broadcastCurrentOfficeFilePages } from '../handleRequests';
import { getConfigValue } from '../../../../helpers/utils';
import { findOfficePageFile, type OfficePageLoad } from '../navigationQueue';

interface IUseOfficePageSyncer {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isPresenter?: boolean;
  currentPage: number;
}

const useOfficePageSyncer = ({ excalidrawAPI, isPresenter, currentPage }: IUseOfficePageSyncer) => {
  const currentOfficeFilePages = useAppSelector((state) => state.whiteboard.currentOfficeFilePages);

  /**
   * Loads the office page image of `fileId`. The page list is read from the
   * store at call time and scoped to that file, so a queued switch can never
   * fetch a page with another file's metadata. Purely a fetch: the caller
   * applies the result, so a superseded navigation never adds files or paints.
   */
  const syncOfficeFilePage = useCallback(
    async (
      fileId: string,
      pageToSync: number,
      isCurrent?: () => boolean,
    ): Promise<OfficePageLoad | null> => {
      if (!excalidrawAPI || !isPresenter) {
        return null;
      }

      const { currentWhiteboardOfficeFileId, currentOfficeFilePages } = store.getState().whiteboard;
      const file = findOfficePageFile<IWhiteboardFile>(
        currentOfficeFilePages,
        fileId,
        currentWhiteboardOfficeFileId,
        pageToSync,
      );
      if (!file) {
        return null;
      }

      // Simplified check: if an element with this ID already exists, skip it.
      const elementExists = excalidrawAPI
        .getSceneElementsIncludingDeleted()
        .some((el) => el.id === file.id);
      if (elementExists) {
        return null;
      }

      const url =
        getConfigValue<string>('serverUrl', 'http://localhost:8080', 'PLUG_N_MEET_SERVER_URL') +
        '/download/uploadedFile/' +
        file.filePath;
      const result = await fetchFileWithElm(
        url,
        file.id,
        file.isOfficeFile,
        file.uploaderWhiteboardHeight,
        file.uploaderWhiteboardWidth,
        file.metaFilePath,
      );

      if (!result) {
        return null; // No result, no need to proceed
      }
      if (isCurrent && !isCurrent()) {
        return null; // navigation moved on: drop the result instead of applying it
      }

      return { images: [result.image], elements: result.elms };
    },
    [excalidrawAPI, isPresenter],
  );

  /**
   * Effect to proactively preload adjacent office file pages.
   * This is triggered whenever the current office document or the current page changes.
   * Pre-loading helps to make page navigation feel faster and more responsive.
   */
  useEffect(() => {
    if (isPresenter) {
      // broadcast to everyone else
      void broadcastCurrentOfficeFilePages(currentOfficeFilePages);
    }

    if (currentOfficeFilePages !== '') {
      try {
        const documentPages: Array<IWhiteboardFile> = JSON.parse(currentOfficeFilePages);
        if (documentPages.length) {
          preloadOfficeFilePages(documentPages, currentPage);
        }
      } catch (e) {
        console.error('Failed to parse office file pages for preloading.', e);
      }
    }
  }, [isPresenter, currentOfficeFilePages, currentPage]);

  return {
    syncOfficeFilePage,
  };
};

export default useOfficePageSyncer;
