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

import { getConfigValue } from '../../../helpers/utils';
import { ensureImageDataIsLoaded, ImageCustomData } from './handleFiles';
import {
  DEFAULT_A4_MARGIN,
  DEFAULT_PAGE_ORIENTATION,
  PageOrientation,
  VIRTUAL_WORKSPACE_WIDTH,
  VIRTUAL_WORKSPACE_HEIGHT,
} from '../export-pdf/types';
import { getPageSize, resolvePageOrientation } from '../export-pdf/utils';

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

export interface PageBoundaryMetrics {
  orientation: PageOrientation;
  /** Full A4 page size (includes margin). */
  pageWidth: number;
  pageHeight: number;
  /** Drawable area inside the red guide (page minus margin). */
  width: number;
  height: number;
  /** Top-left of the drawable guide. */
  startX: number;
  startY: number;
  /** Top-left of the full page frame (guide inset by half margin each side). */
  pageStartX: number;
  pageStartY: number;
  /** Half of DEFAULT_A4_MARGIN — padding on each side of the drawable area. */
  edgeInset: number;
}

/**
 * Logical drawable frame metrics. When pageWidth/pageHeight are given
 * (exact size from page_N_meta.json) they win; otherwise A4 by orientation.
 */
export const getPageBoundaryMetrics = (
  orientation: PageOrientation = DEFAULT_PAGE_ORIENTATION,
  pageWidth?: number,
  pageHeight?: number,
): PageBoundaryMetrics => {
  const size =
    pageWidth && pageHeight
      ? { width: pageWidth, height: pageHeight }
      : getPageSize(orientation);
  const frameWidth = size.width;
  const frameHeight = size.height;
  const edgeInset = DEFAULT_A4_MARGIN / 2;
  const width = frameWidth - DEFAULT_A4_MARGIN;
  const height = frameHeight - DEFAULT_A4_MARGIN;

  // Use the same standard workspace reference size as handleFiles.ts
  // to ensure absolute coordinate alignment under all browser dimensions and resizes.
  const startX = (VIRTUAL_WORKSPACE_WIDTH - width) / 2;
  const startY = (VIRTUAL_WORKSPACE_HEIGHT - height) / 2;

  return {
    orientation,
    pageWidth: frameWidth,
    pageHeight: frameHeight,
    width,
    height,
    startX,
    startY,
    pageStartX: startX - edgeInset,
    pageStartY: startY - edgeInset,
    edgeInset,
  };
};

export const prepareA4BoundaryGuide = (
  orientation: PageOrientation = DEFAULT_PAGE_ORIENTATION,
  pageWidth?: number,
  pageHeight?: number,
): OrderedExcalidrawElement[] => {
  const metrics = getPageBoundaryMetrics(orientation, pageWidth, pageHeight);

  return convertToExcalidrawElements(
    [
      {
        id: A4_BOUNDARY_GUIDE_ID,
        type: 'rectangle',
        x: metrics.startX,
        y: metrics.startY,
        width: metrics.width,
        height: metrics.height,
        strokeColor: '#ff0000',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'dashed',
        opacity: 20,
        locked: true,
        customData: {
          pageOrientation: orientation,
          pageWidth: metrics.pageWidth,
          pageHeight: metrics.pageHeight,
        },
      },
    ],
    {
      regenerateIds: false,
    },
  );
};

/**
 * Returns the current scene elements (including tombstones) with the A4
 * boundary guide excluded. Used before writing local edits into the CRDT.
 */
export const getSceneElementsWithoutBoundary = (
  excalidrawAPI: ExcalidrawImperativeAPI,
): ExcalidrawElement[] => {
  const sceneElements = excalidrawAPI.getSceneElementsIncludingDeleted();
  const hasBoundary = sceneElements.some((e) => e.id === A4_BOUNDARY_GUIDE_ID);
  return hasBoundary
    ? sceneElements.filter((e) => e.id !== A4_BOUNDARY_GUIDE_ID)
    : (sceneElements as ExcalidrawElement[]);
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

export interface ResolvedPageInfo {
  orientation: PageOrientation;
  /** Exact logical page size when stamped (from page_N_meta.json). */
  pageWidth?: number;
  pageHeight?: number;
}

/**
 * Read page info stamped on scene elements (office image / boundary guide).
 * Office pages stamp this from page_N_meta.json when the image is placed.
 * Default: portrait A4.
 */
export const resolvePageInfoFromElements = (
  elements: readonly ExcalidrawElement[],
): ResolvedPageInfo => {
  for (const el of elements) {
    const cd = el.customData as
      | {
          pageOrientation?: string;
          pageWidth?: number;
          pageHeight?: number;
        }
      | undefined;
    if (!cd) {
      continue;
    }
    if (cd.pageWidth && cd.pageHeight) {
      return {
        orientation: resolvePageOrientation(cd.pageOrientation),
        pageWidth: cd.pageWidth,
        pageHeight: cd.pageHeight,
      };
    }
    if (
      cd.pageOrientation === 'landscape' ||
      cd.pageOrientation === 'portrait'
    ) {
      return { orientation: cd.pageOrientation };
    }
  }
  return { orientation: DEFAULT_PAGE_ORIENTATION };
};

/**
 * Order elements by their fractional `index` (Excalidraw z-order).
 *
 * @excalidraw/excalidraw does not export a runtime `sortElements` in 0.18.x
 * (only type-only `element/*` subpaths), so this mirrors the package's
 * internal `orderByFractionalIndex` comparator
 * (packages/element/src/fractionalIndex.ts): plain lexicographic comparison of
 * the fractional index with an element-id tie-break. Elements without an
 * index defensively keep their array order, exactly like the upstream sort.
 */
export const orderElementsByIndex = (elements: ExcalidrawElement[]) => {
  return elements.sort((a, b) => {
    if (a.index && b.index) {
      if (a.index < b.index) {
        return -1;
      } else if (a.index > b.index) {
        return 1;
      }
      return a.id < b.id ? -1 : 1;
    }
    return 1;
  });
};

/**
 * True for image elements whose binary data still needs to be uploaded before
 * they can be synced into the CRDT (mirrors the check in handleRequests.ts).
 */
export const isPendingImageElement = (
  element: ExcalidrawElement,
): element is ExcalidrawImageElement =>
  element.type === 'image' && element.status === 'pending';
