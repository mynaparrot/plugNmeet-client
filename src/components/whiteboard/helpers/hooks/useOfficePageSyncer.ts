import { useCallback } from 'react';
import {
  BinaryFileData,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import { useAppSelector } from '../../../../store';
import { IWhiteboardFile } from '../../../../store/slices/interfaces/whiteboard';
import { fetchFileWithElm } from '../handleFiles';

interface IUseOfficePageSyncer {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

const useOfficePageSyncer = ({ excalidrawAPI }: IUseOfficePageSyncer) => {
  const currentOfficeFilePages = useAppSelector(
    (state) => state.whiteboard.currentOfficeFilePages,
  );
  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);
  const isPresenter = useAppSelector(
    (state) => state.session.currentUser?.metadata?.isPresenter,
  );

  const syncOfficeFilePage = useCallback(async () => {
    if (!excalidrawAPI) {
      return;
    }

    const newImages: Array<BinaryFileData> = [];
    const newElements: Array<ExcalidrawElement> = [];
    const localElements = excalidrawAPI.getSceneElementsIncludingDeleted();

    if (!isPresenter || currentOfficeFilePages === '') {
      return;
    }

    let files: IWhiteboardFile[] = [];
    try {
      const documentPages: Array<IWhiteboardFile> = JSON.parse(
        currentOfficeFilePages,
      );
      files = documentPages.filter(
        (file) => file.currentPage === currentPage && file.isOfficeFile,
      );
    } catch (e) {
      console.error('Failed to parse office file page data.', e);
      return;
    }

    // Use Promise.all to fetch missing files concurrently.
    await Promise.all(
      files.map(async (file) => {
        // Simplified check: if an element with this ID already exists, skip it.
        const elementExists = localElements.some((el) => el.id === file.id);
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
        }
      }),
    );

    if (!newImages.length) {
      return;
    }

    // Add all binary file data at once.
    excalidrawAPI.addFiles(newImages);

    // Add all new elements to the scene in a single update.
    excalidrawAPI.updateScene({
      elements: [...localElements, ...newElements],
    });
  }, [excalidrawAPI, isPresenter, currentOfficeFilePages, currentPage]);

  return {
    syncOfficeFilePage,
  };
};

export default useOfficePageSyncer;
