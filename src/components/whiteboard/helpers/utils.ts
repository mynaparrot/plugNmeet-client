import { RefObject } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import {
  ExcalidrawElement,
  ExcalidrawImageElement,
} from '@excalidraw/excalidraw/element/types';

import { broadcastSceneOnChange } from './handleRequestedWhiteboardData';
import { store } from '../../../store';
import { sleep } from '../../../helpers/utils';
import { updateExcalidrawElements } from '../../../store/slices/whiteboard';
import { ensureImageDataIsLoaded, ImageCustomData } from './handleFiles';

// A simple in-memory cache for preloaded library items.
const libraryCache = new Map<string, Blob>();

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
      let blob: Blob;
      if (libraryCache.has(item)) {
        // Cache hit: Use the cached blob.
        blob = libraryCache.get(item)!;
      } else {
        // Cache miss: Fetch the library, convert to blob, and cache it.
        const request = await fetch(item);
        blob = await request.blob();
        libraryCache.set(item, blob);
      }
      await excalidrawAPI.updateLibrary({
        libraryItems: blob, // Use the blob (from cache or network)
        merge: true,
        defaultStatus: 'published',
      });
    } catch (e) {
      console.error(e);
    }
  });
};

export const formatStorageKey = (pageNumber: number, fileId?: string) => {
  const key =
    fileId ?? store.getState().whiteboard.currentWhiteboardOfficeFileId;
  return `${key}_${pageNumber}`;
};

export const savePageData = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  page: number,
  fileId?: string,
) => {
  const elms = excalidrawAPI.getSceneElementsIncludingDeleted();
  if (elms.length) {
    sessionStorage.setItem(
      formatStorageKey(page, fileId),
      JSON.stringify(elms),
    );
  }
};

export const displaySavedPageData = (
  getExcalidrawAPI: () => ExcalidrawImperativeAPI | null,
  isPresenter: boolean,
  page: number,
  isSwitching?: RefObject<boolean>,
) => {
  const data = sessionStorage.getItem(formatStorageKey(page));
  const excalidrawAPI = getExcalidrawAPI();
  let hasData = false;

  if (data && excalidrawAPI) {
    const elements = JSON.parse(data);
    if (Array.isArray(elements) && elements.length) {
      hasData = true;
      store.dispatch(updateExcalidrawElements(data));

      if (isPresenter) {
        // better to broadcast full screen
        sleep(1000).then(() => {
          const latestElms =
            getExcalidrawAPI()?.getSceneElementsIncludingDeleted();
          broadcastSceneOnChange(latestElms ?? elements, true).then();
        });
      }
    }
  }

  if (isSwitching) {
    isSwitching.current = false;
  }
  return hasData;
};

/**
 * Iterates through a list of Excalidraw elements and ensures that the
 * binary data for any image elements is loaded into the scene.
 * This is crucial for correctly rendering images received from remote peers.
 * @param excalidrawAPI The Excalidraw API instance.
 * @param elements An array of Excalidraw elements to process.
 */
export const ensureAllImagesDataIsLoaded = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  elements: readonly ExcalidrawElement[],
) => {
  for (const elm of elements) {
    if (elm.type === 'image' && elm.customData) {
      ensureImageDataIsLoaded(
        excalidrawAPI,
        elm as ExcalidrawImageElement,
        elm.customData as ImageCustomData,
      ).then();
    }
  }
};
