import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

import { broadcastSceneOnChange } from './handleRequestedWhiteboardData';
import { store } from '../../../store';
import {
  IWhiteboardFile,
  IWhiteboardOfficeFile,
  WhiteboardFileConversionRes,
} from '../../../store/slices/interfaces/whiteboard';
import { randomString } from '../../../helpers/utils';
import { addWhiteboardUploadedOfficeFiles } from '../../../store/slices/whiteboard';

const defaultPreloadedLibraryItems = [
  'https://libraries.excalidraw.com/libraries/BjoernKW/UML-ER-library.excalidrawlib',
  'https://libraries.excalidraw.com/libraries/aretecode/decision-flow-control.excalidrawlib',
  'https://libraries.excalidraw.com/libraries/dbssticky/data-viz.excalidrawlib',
  'https://libraries.excalidraw.com/libraries/pgilfernandez/basic-shapes.excalidrawlib',
  'https://libraries.excalidraw.com/libraries/ocapraro/bubbles.excalidrawlib',
];

export const addPreloadedLibraryItems = (
  excalidrawAPI: ExcalidrawImperativeAPI,
) => {
  let libraryItems = defaultPreloadedLibraryItems;
  if (
    typeof (window as any).WHITEBOARD_PRELOADED_LIBRARY_ITEMS !== 'undefined' &&
    Array.isArray((window as any).WHITEBOARD_PRELOADED_LIBRARY_ITEMS)
  ) {
    libraryItems = (window as any).WHITEBOARD_PRELOADED_LIBRARY_ITEMS;
  }

  libraryItems.forEach(async (item) => {
    try {
      const request = await fetch(item);
      const blob = await request.blob();
      await excalidrawAPI.updateLibrary({
        libraryItems: blob,
        merge: true,
        defaultStatus: 'published',
      });
    } catch (e) {
      console.error(e);
    }
  });
};

export const formatStorageKey = (pageNumber) => {
  const currentFileId =
    store.getState().whiteboard.currentWhiteboardOfficeFileId;
  return `${currentFileId}_${pageNumber}`;
};

export const savePageData = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  page: number,
) => {
  const elms = excalidrawAPI.getSceneElementsIncludingDeleted();
  if (elms.length) {
    sessionStorage.setItem(formatStorageKey(page), JSON.stringify(elms));
  }
};

export const displaySavedPageData = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  isPresenter: boolean,
  page: number,
) => {
  const data = sessionStorage.getItem(formatStorageKey(page));
  if (data && excalidrawAPI) {
    const elements = JSON.parse(data);
    if (Array.isArray(elements) && elements.length) {
      excalidrawAPI.updateScene({ elements });
      if (isPresenter) {
        // better to broadcast full screen
        broadcastSceneOnChange(elements, true);
      }
    }
  }
};

export const handleToAddWhiteboardUploadedOfficeNewFile = (
  whiteboardFileConversionRes: WhiteboardFileConversionRes,
  uploaderWhiteboardHeight = 260,
  uploaderWhiteboardWidth = 1160,
) => {
  const files: Array<IWhiteboardFile> = [];
  for (let i = 0; i < whiteboardFileConversionRes.totalPages; i++) {
    const fileName = 'page_' + (i + 1) + '.png';
    const file: IWhiteboardFile = {
      id: randomString(),
      currentPage: i + 1,
      filePath: whiteboardFileConversionRes.filePath + '/' + fileName,
      fileName,
      uploaderWhiteboardHeight,
      uploaderWhiteboardWidth,
      isOfficeFile: true,
    };
    files.push(file);
  }

  const newFile: IWhiteboardOfficeFile = {
    fileId: whiteboardFileConversionRes.fileId,
    fileName: whiteboardFileConversionRes.fileName,
    filePath: whiteboardFileConversionRes.filePath,
    totalPages: whiteboardFileConversionRes.totalPages,
    pageFiles: JSON.stringify(files),
  };

  store.dispatch(addWhiteboardUploadedOfficeFiles(newFile));
  return newFile;
};
