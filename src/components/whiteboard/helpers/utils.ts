import { RefObject } from 'react';
import { convertToExcalidrawElements } from '@excalidraw/excalidraw';
import {
  ExcalidrawImperativeAPI,
  NormalizedZoomValue,
} from '@excalidraw/excalidraw/types';
import {
  ExcalidrawElement,
  ExcalidrawImageElement,
  OrderedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';

import { broadcastSceneOnChange } from './handleRequests';
import { store } from '../../../store';
import { getConfigValue, sleep } from '../../../helpers/utils';
import { ensureImageDataIsLoaded, ImageCustomData } from './handleFiles';
import { DB_STORE_NAMES, idbGet, idbStore } from '../../../helpers/libs/idb';
import {
  DEFAULT_A4_HEIGHT,
  DEFAULT_A4_MARGIN,
  DEFAULT_A4_WIDTH,
  VIRTUAL_WORKSPACE_WIDTH,
  VIRTUAL_WORKSPACE_HEIGHT,
} from '../export-pdf/types';

// A simple in-memory cache for preloaded library items.
const libraryCache = new Map<string, Blob>();
export const A4_BOUNDARY_GUIDE_ID = 'a4-boundary-guide-id';

const defaultPreloadedLibraryItems = [
  'https://libraries.excalidraw.com/libraries/BjoernKW/UML-ER-library.excalidrawlib',
  'https://libraries.excalidraw.com/libraries/aretecode/decision-flow-control.excalidrawlib',
  'https://libraries.excalidraw.com/libraries/dbssticky/data-viz.excalidrawlib',
  'https://libraries.excalidraw.com/libraries/pgilfernandez/basic-shapes.excalidrawlib',
  'https://libraries.excalidraw.com/libraries/ocapraro/bubbles.excalidrawlib',
];

export const addPreloadedLibraryItems = async (
  excalidrawAPI: ExcalidrawImperativeAPI,
) => {
  let libraryItems = defaultPreloadedLibraryItems;
  const getFromCnf = getConfigValue<string[] | undefined>(
    'whiteboardPreloadedLibraryItems',
    undefined,
    'WHITEBOARD_PRELOADED_LIBRARY_ITEMS',
  );
  if (getFromCnf && Array.isArray(getFromCnf)) {
    libraryItems = getFromCnf;
  }

  const fetchPromises = libraryItems.map(async (item) => {
    if (libraryCache.has(item)) {
      return libraryCache.get(item)!;
    }
    const request = await fetch(item);
    const blob = await request.blob();
    libraryCache.set(item, blob);
    return blob;
  });

  const results = await Promise.allSettled(fetchPromises);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      try {
        // Excalidraw expects a single Blob at a time rather than a Blob[]
        await excalidrawAPI.updateLibrary({
          libraryItems: result.value,
          merge: true,
          defaultStatus: 'published',
        });
      } catch (err) {
        console.error('Failed to register library item onto Excalidraw:', err);
      }
    } else {
      console.error(
        'Failed to pre-fetch whiteboard library item:',
        result.reason,
      );
    }
  }
};

export const formatStorageKey = (pageNumber: number, fileId?: string) => {
  const key =
    fileId ?? store.getState().whiteboard.currentWhiteboardOfficeFileId;
  return `${key}_${pageNumber}`;
};

export const getStorageKeyPageNumberRegex = (fileId: string) => {
  return new RegExp(`^${fileId}_(\\d+)$`);
};

export const savePageData = async (
  elms: readonly OrderedExcalidrawElement[],
  page: number,
  fileId?: string,
) => {
  const toSaveElms = elms.filter((e) => e.id !== A4_BOUNDARY_GUIDE_ID);

  if (toSaveElms.length > 0) {
    await idbStore(
      DB_STORE_NAMES.WHITEBOARD,
      formatStorageKey(page, fileId),
      toSaveElms,
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
  // 1. Attempt to retrieve the page data from IndexedDB.
  const elements = await idbGet<readonly OrderedExcalidrawElement[]>(
    DB_STORE_NAMES.WHITEBOARD,
    formatStorageKey(page, currentFileId),
  );
  let hasData = false;

  // 2. Proceed only if data exists and the Excalidraw API is ready.
  if (elements && elements.length) {
    try {
      hasData = true;

      // 3. It's important to do this now because other syncs are locked by `isSwitching.current = true`.
      // Ensure any image files referenced in the elements are loaded.
      //and update the Excalidraw scene with the loaded elements.
      ensureAllImagesDataIsLoaded(excalidrawAPI, elements);
      excalidrawAPI.updateScene({ elements });

      // 4. If the user is the presenter, broadcast the complete scene to all other participants.
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

  // 5. Reset the switching flag to re-enable normal synchronization.
  if (isSwitching) {
    isSwitching.current = false;
  }
  // 6. Return whether data was successfully loaded.
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
  Promise.allSettled(imagePromises).then((results) => {
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        console.error(
          `Error loading image data at index ${idx}:`,
          result.reason,
        );
      }
    });
  });
};

export const prepareA4BoundaryGuide = (): OrderedExcalidrawElement[] => {
  const height = DEFAULT_A4_HEIGHT - DEFAULT_A4_MARGIN;
  const width = DEFAULT_A4_WIDTH - DEFAULT_A4_MARGIN;

  // Use the same standard workspace reference size as handleFiles.ts
  // to ensure absolute coordinate alignment under all browser dimensions and resizes.
  const startX = (VIRTUAL_WORKSPACE_WIDTH - width) / 2;
  const startY = (VIRTUAL_WORKSPACE_HEIGHT - height) / 2;

  return convertToExcalidrawElements(
    [
      {
        id: A4_BOUNDARY_GUIDE_ID,
        type: 'rectangle',
        x: startX,
        y: startY,
        width: width,
        height: height,
        strokeColor: '#ff0000',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'dashed',
        opacity: 20,
        locked: true,
      },
    ],
    {
      regenerateIds: false,
    },
  );
};

export const getA4WidthBasedZoom = (
  viewportWidth: number,
  targetWidth: number,
): NormalizedZoomValue => {
  const VIEWPORT_HORIZONTAL_PADDING = 40;
  const MIN_ZOOM = 0.1;
  const MAX_INITIAL_ZOOM = 1;

  const safeViewportWidth = Math.max(
    viewportWidth - VIEWPORT_HORIZONTAL_PADDING,
    1,
  );

  return Math.max(
    Math.min(safeViewportWidth / targetWidth, MAX_INITIAL_ZOOM),
    MIN_ZOOM,
  ) as NormalizedZoomValue;
};
