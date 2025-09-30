import { useCallback, useEffect } from 'react';
import {
  BinaryFileData,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import { useAppSelector } from '../../../../store';
import { IWhiteboardFile } from '../../../../store/slices/interfaces/whiteboard';
import { fetchFileWithElm } from '../fileReader';

interface IUseWhiteboardFileElementsSync {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

const useWhiteboardFileElementsSync = ({
  excalidrawAPI,
}: IUseWhiteboardFileElementsSync) => {
  const whiteboardOfficeFilePagesAndOtherImages = useAppSelector(
    (state) => state.whiteboard.whiteboardOfficeFilePagesAndOtherImages,
  );
  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);

  const handleExcalidrawAddFiles = useCallback(
    async (files: Array<IWhiteboardFile>) => {
      if (!excalidrawAPI) {
        return;
      }
      const fileReadImages: Array<BinaryFileData> = [];
      const fileReadElms: Array<ExcalidrawElement> = [];

      for (const file of files) {
        const url =
          (window as any).PLUG_N_MEET_SERVER_URL +
          '/download/uploadedFile/' +
          file.filePath;

        const canvasFiles = excalidrawAPI.getFiles();
        const elms = excalidrawAPI.getSceneElementsIncludingDeleted();
        let hasFile = false;

        for (const canvasFile in canvasFiles) {
          if (canvasFiles[canvasFile].id === file.id) {
            const hasElm = elms.some(
              (el) => el.type === 'image' && el.fileId === file.id,
            );
            if (hasElm) {
              hasFile = true;
              break;
            }
          }
        }

        if (!hasFile) {
          const result = await fetchFileWithElm(
            url,
            file.id,
            file.isOfficeFile,
            file.uploaderWhiteboardHeight,
            file.uploaderWhiteboardWidth,
            file.excalidrawElement,
          );
          if (result) {
            fileReadImages.push(result.image);
            fileReadElms.push(result.elm);
          }
        }
      }

      if (!fileReadImages.length) {
        return;
      }
      excalidrawAPI.addFiles(fileReadImages);

      fileReadElms.forEach((element) => {
        const elements = excalidrawAPI
          .getSceneElementsIncludingDeleted()
          .slice();
        const hasElm = elements.some((elm) => elm.id === element.id);

        if (!hasElm) {
          elements.push(element as any);
        }

        excalidrawAPI.updateScene({ elements });
      });
    },
    [excalidrawAPI],
  );

  useEffect(() => {
    if (whiteboardOfficeFilePagesAndOtherImages && excalidrawAPI) {
      try {
        const files: Array<IWhiteboardFile> = JSON.parse(
          whiteboardOfficeFilePagesAndOtherImages,
        );
        if (files.length) {
          const currentPageFiles = files.filter(
            (file) => file.currentPage === currentPage,
          );
          handleExcalidrawAddFiles(currentPageFiles).then();
        }
      } catch (e) {
        console.error('Failed to parse whiteboard files', e);
      }
    }
  }, [
    excalidrawAPI,
    whiteboardOfficeFilePagesAndOtherImages,
    currentPage,
    handleExcalidrawAddFiles,
  ]);
};

export default useWhiteboardFileElementsSync;
