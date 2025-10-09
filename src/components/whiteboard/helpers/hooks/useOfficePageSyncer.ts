import { useCallback, useEffect } from 'react';
import {
  BinaryFileData,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import { useAppSelector } from '../../../../store';
import { IWhiteboardFile } from '../../../../store/slices/interfaces/whiteboard';
import { fetchFileWithElm, preloadOfficeFilePages } from '../handleFiles';
import { broadcastCurrentOfficeFilePages } from '../handleRequestedWhiteboardData';

interface IUseOfficePageSyncer {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isPresenter?: boolean;
  currentPage: number;
}

const useOfficePageSyncer = ({
  excalidrawAPI,
  isPresenter,
  currentPage,
}: IUseOfficePageSyncer) => {
  const currentOfficeFilePages = useAppSelector(
    (state) => state.whiteboard.currentOfficeFilePages,
  );

  const syncOfficeFilePage = useCallback(
    async (pageToSync: number) => {
      if (!excalidrawAPI || !isPresenter || currentOfficeFilePages === '') {
        return;
      }

      const newImages: Array<BinaryFileData> = [];
      const newElements: Array<ExcalidrawElement> = [];
      const localElements = excalidrawAPI.getSceneElementsIncludingDeleted();

      let file: IWhiteboardFile | undefined;
      try {
        const documentPages: Array<IWhiteboardFile> = JSON.parse(
          currentOfficeFilePages,
        );
        file = documentPages.find(
          (f) => f.currentPage === pageToSync && f.isOfficeFile,
        );
      } catch (e) {
        console.error('Failed to parse office file page data.', e);
        return;
      }

      if (!file) {
        return;
      }

      // Simplified check: if an element with this ID already exists, skip it.
      const elementExists = localElements.some((el) => el.id === file?.id);
      if (elementExists) {
        return;
      }
      const url =
        (window as any).PLUG_N_MEET_SERVER_URL +
        '/download/uploadedFile/' +
        file.filePath;
      const result = await fetchFileWithElm(
        url,
        file.id,
        file.isOfficeFile,
        file.uploaderWhiteboardHeight,
        file.uploaderWhiteboardWidth,
      );

      if (result) {
        newImages.push(result.image);
        newElements.push(result.elm);
      } else {
        return; // No result, no need to proceed
      }

      // Add all binary file data at once.
      excalidrawAPI.addFiles(newImages);

      return [...localElements, ...newElements];
    },
    [excalidrawAPI, isPresenter, currentOfficeFilePages],
  );

  /**
   * Effect to proactively preload adjacent office file pages.
   * This is triggered whenever the current office document or the current page changes.
   * Pre-loading helps to make page navigation feel faster and more responsive.
   */
  useEffect(() => {
    if (isPresenter) {
      // broadcast to everyone else
      broadcastCurrentOfficeFilePages(currentOfficeFilePages);
    }

    if (currentOfficeFilePages !== '') {
      try {
        const documentPages: Array<IWhiteboardFile> = JSON.parse(
          currentOfficeFilePages,
        );
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
