import { RefObject } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import {
  ExcalidrawElement,
  ExcalidrawImageElement,
  OrderedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';

import {
  broadcastSceneOnChange,
  sendClearWhiteboardSignal,
} from './handleRequestedWhiteboardData';
import { store } from '../../../store';
import { sleep } from '../../../helpers/utils';
import { ensureImageDataIsLoaded, ImageCustomData } from './handleFiles';
import { DB_STORE_NAMES, idbGet, idbStore } from '../../../helpers/libs/idb';

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

export const savePageData = async (
  elms: readonly OrderedExcalidrawElement[],
  page: number,
  fileId?: string,
) => {
  if (elms.length) {
    await idbStore(
      DB_STORE_NAMES.WHITEBOARD,
      formatStorageKey(page, fileId),
      elms,
    );
  }
};

export const displaySavedPageData = async (
  excalidrawAPI: ExcalidrawImperativeAPI,
  isPresenter: boolean,
  page: number,
  currentFileId?: string,
  isSwitching?: RefObject<boolean>,
) => {
  // 1. Send everyone to clean their whiteboard
  // as we're changing page/file or starting up
  sendClearWhiteboardSignal();

  // 2. Attempt to retrieve the page data from IndexedDB.
  const elements = await idbGet<readonly OrderedExcalidrawElement[]>(
    DB_STORE_NAMES.WHITEBOARD,
    formatStorageKey(page, currentFileId),
  );
  let hasData = false;

  // 3. Proceed only if data exists and the Excalidraw API is ready.
  if (elements && elements.length) {
    try {
      hasData = true;

      // 4. It's important to do this now because other syncs are locked by `isSwitching.current = true`.
      // Ensure any image files referenced in the elements are loaded.
      //and update the Excalidraw scene with the loaded elements.
      ensureAllImagesDataIsLoaded(excalidrawAPI, elements);
      excalidrawAPI.updateScene({ elements });

      // 5. If the user is the presenter, broadcast the complete scene to all other participants.
      if (isPresenter) {
        // A short delay ensures all elements are rendered before broadcasting.
        await sleep(300);
        const latestElms = excalidrawAPI.getSceneElementsIncludingDeleted();
        await broadcastSceneOnChange(latestElms ?? elements, true);
        // wait until last data send complete
        await sleep(300);
      }
    } catch (e) {
      console.error('Failed to parse or display saved page data.', e);
    }
  }

  // 6. Reset the switching flag to re-enable normal synchronization.
  if (isSwitching) {
    isSwitching.current = false;
  }
  // 7. Return whether data was successfully loaded.
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
  const imagePromises = elements
    .filter(
      (elm): elm is ExcalidrawImageElement =>
        elm.type === 'image' && !!elm.customData,
    )
    .map((elm) =>
      ensureImageDataIsLoaded(
        excalidrawAPI,
        elm,
        elm.customData as ImageCustomData,
      ),
    );
  // We fire off all the promises but don't wait for them to complete.
  // This allows the UI to update while images load in the background.
  Promise.all(imagePromises).catch((e) =>
    console.error('Error loading image data:', e),
  );
};
