import {
  BinaryFileData,
  DataURL,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types';
import {
  ExcalidrawElement,
  ExcalidrawImageElement,
} from '@excalidraw/excalidraw/element/types';
import { randomInteger, randomString } from '../../../helpers/utils';
import { RoomUploadedFileType } from 'plugnmeet-protocol-js';
import { store } from '../../../store';
import { uploadBase64EncodedFile } from '../../../helpers/fileUpload';
import {
  IWhiteboardFile,
  IWhiteboardOfficeFile,
  WhiteboardFileConversionRes,
} from '../../../store/slices/interfaces/whiteboard';
import { addWhiteboardUploadedOfficeFile } from '../../../store/slices/whiteboard';

export interface FileReaderResult {
  image: BinaryFileData;
  elm: ExcalidrawElement;
}

export interface ImageCustomData {
  fileUrl: string;
  isOfficeFile: boolean;
  uploaderWhiteboardHeight?: number;
  uploaderWhiteboardWidth?: number;
}

const imageCache = new Map<string, string>();
const uploadingCanvasBinaryFile: Map<string, string> = new Map();
const processedImageElements: Map<string, string> = new Map();

export const createAndRegisterOfficeFile = (
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

  store.dispatch(addWhiteboardUploadedOfficeFile(newFile));
  return newFile;
};

/**
 * Fetches an image from a URL, converts it to a base64 Data URL,
 * and caches it in memory. If the image is already in the cache,
 * it returns the cached data directly.
 * @param url The URL of the image to fetch and cache.
 * @returns A promise that resolves to the base64 Data URL of the image, or null if fetching fails.
 */
const fetchAndCacheImage = async (url: string): Promise<string | null> => {
  // 1. Check if the image is already in the cache.
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  let base64: string | null = null;
  try {
    // 2. If not cached, fetch the image from the network.
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch file from ${url}: ${res.statusText}`);
    } else {
      // 3. Convert the response to a blob, then to a base64 Data URL.
      const imageData = await res.blob();
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageData);
      });
    }
  } catch (error) {
    console.error(`Error fetching or processing file from ${url}:`, error);
  } finally {
    // 4. If the fetch was successful, store the base64 data in the cache.
    if (base64) {
      imageCache.set(url, base64);
    }
  }
  // 5. Return the result (either the base64 string or null if it failed).
  return base64;
};

export const fetchFileWithElm = async (
  url: string,
  file_id: string,
  is_office_file: boolean,
  uploaderWhiteboardHeight?: number,
  uploaderWhiteboardWidth?: number,
): Promise<FileReaderResult | null> => {
  try {
    // Use the shared helper to get the image data from cache or network.
    const imgData = await fetchAndCacheImage(url);

    if (!imgData) {
      // If fetching/caching failed, stop here.
      return null;
    }

    const fileMimeType = imgData.substring(
      'data:'.length,
      imgData.indexOf(';base64'),
    );

    const excalidrawHeight = uploaderWhiteboardHeight ?? 260;
    const excalidrawWidth = uploaderWhiteboardWidth ?? 1160;

    if (
      fileMimeType === 'image/png' ||
      fileMimeType === 'image/jpeg' ||
      fileMimeType === 'image/jpg'
    ) {
      const image = new Image();
      image.src = imgData;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const { fileHeight, fileWidth } = getFileDimension(
        image.height,
        image.width,
        excalidrawWidth,
      );

      return prepareForExcalidraw(
        file_id,
        url,
        imgData,
        fileMimeType,
        fileHeight,
        fileWidth,
        excalidrawHeight,
        excalidrawWidth,
        is_office_file,
        uploaderWhiteboardHeight,
        uploaderWhiteboardWidth,
      );
    } else if (fileMimeType === 'image/svg+xml') {
      const fileHeight = excalidrawHeight * 0.8;
      const fileWidth = excalidrawWidth * 0.7;

      return prepareForExcalidraw(
        file_id,
        url,
        imgData,
        fileMimeType,
        fileHeight,
        fileWidth,
        excalidrawHeight,
        excalidrawWidth,
        is_office_file,
        uploaderWhiteboardHeight,
        uploaderWhiteboardWidth,
      );
    } else {
      console.error('unsupported file type:', fileMimeType);
      return null;
    }
  } catch (error) {
    console.error('Error fetching or processing file:', error);
    return null;
  }
};

const prepareForExcalidraw = (
  fileId: string,
  fileUrl: string,
  imgData: string,
  fileMimeType: string,
  fileHeight: number,
  fileWidth: number,
  excalidrawHeight: number,
  excalidrawWidth: number,
  isOfficeFile: boolean,
  uploaderWhiteboardHeight?: number,
  uploaderWhiteboardWidth?: number,
): FileReaderResult => {
  const image: BinaryFileData = {
    id: fileId as any,
    dataURL: imgData as DataURL,
    mimeType: fileMimeType as any,
    created: Date.now(),
  };

  let elm: ExcalidrawImageElement = {
    id: fileId,
    type: 'image',
    x: (excalidrawWidth - fileWidth) / 2,
    y: (excalidrawHeight - fileHeight) / 2,
    width: fileWidth,
    height: fileHeight,
    angle: 0,
    strokeColor: 'transparent',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: randomInteger(),
    version: 1,
    versionNonce: randomInteger(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    status: 'saved',
    fileId: fileId as any,
    scale: [1, 1],
    locked: isOfficeFile,
    frameId: null,
    crop: null,
    index: null,
    customData: {
      fileUrl,
      isOfficeFile,
      uploaderWhiteboardHeight,
      uploaderWhiteboardWidth,
    },
  };

  return {
    image,
    elm,
  };
};

const getFileDimension = (
  height: number,
  width: number,
  excalidrawWidth: number,
) => {
  let fileHeight = height;
  let fileWidth = width;

  const excalidrawActualWidth = excalidrawWidth - 150;
  const reducedBy = 0.01;

  while (fileWidth > excalidrawActualWidth) {
    fileHeight *= 1 - reducedBy;
    fileWidth *= 1 - reducedBy;
  }
  return { fileHeight, fileWidth };
};

export const uploadCanvasBinaryFile = async (
  elm: ExcalidrawImageElement,
  file: BinaryFileData,
  excalidrawAPI?: ExcalidrawImperativeAPI,
) => {
  if (uploadingCanvasBinaryFile.has(file.id)) {
    return;
  }

  try {
    // Add to the queue to prevent duplicate uploads.
    uploadingCanvasBinaryFile.set(file.id, elm.id);

    const res = await uploadBase64EncodedFile(
      `${file.id}.png`,
      file.dataURL,
      RoomUploadedFileType.WHITEBOARD_IMAGE_FILE,
    );
    if (!res || !res.status) {
      // If upload fails, we stop here. The `finally` block will clean up the queue.
      console.error('Failed to upload canvas binary file.');
      return;
    }
    const fileUrl =
      (window as any).PLUG_N_MEET_SERVER_URL +
      '/download/uploadedFile/' +
      res.filePath;

    const customData: ImageCustomData = {
      fileUrl,
      isOfficeFile: false,
      uploaderWhiteboardHeight: excalidrawAPI?.getAppState().height,
      uploaderWhiteboardWidth: excalidrawAPI?.getAppState().width,
    };

    const localElements =
      excalidrawAPI?.getSceneElementsIncludingDeleted() ?? [];
    let updatedImageElement: ExcalidrawImageElement | undefined;

    // Use map for a cleaner, immutable update.
    const newElms = localElements.map((el) => {
      if (el.id === elm.id && el.type === 'image') {
        updatedImageElement = {
          ...el,
          status: 'saved',
          version: el.version + 1,
          versionNonce: el.versionNonce + 1,
          customData,
        };
        return updatedImageElement;
      }
      return el;
    });

    // Finally, update the scene with the element marked as 'saved'.
    excalidrawAPI?.updateScene({
      elements: newElms,
    });
  } catch (error) {
    console.error('Error during canvas file upload:', error);
  } finally {
    // Always remove from the queue, whether it succeeded or failed.
    uploadingCanvasBinaryFile.delete(file.id);
  }
};

export const ensureImageDataIsLoaded = async (
  excalidrawAPI: ExcalidrawImperativeAPI,
  elm: ExcalidrawImageElement,
  customData: ImageCustomData,
) => {
  if (!elm.fileId || processedImageElements.has(elm.id)) {
    return;
  }

  processedImageElements.set(elm.id, elm.fileId);

  const canvasFiles = excalidrawAPI.getFiles();
  const fileExist = Object.values(canvasFiles).some(
    (file) => file.id === elm.fileId,
  );
  if (fileExist) {
    // do nothing
    return;
  }

  const result = await fetchFileWithElm(
    customData.fileUrl,
    elm.fileId,
    customData.isOfficeFile,
    customData.uploaderWhiteboardHeight,
    customData.uploaderWhiteboardWidth,
  );

  if (!result) {
    console.error('fetching image file failed', customData.fileUrl);
    processedImageElements.delete(elm.id);
    return;
  }

  const fileReadImages: Array<BinaryFileData> = [result.image];
  excalidrawAPI.addFiles(fileReadImages);
};

export function cleanProcessedImageElementsMap() {
  processedImageElements.clear();
}

/**
 * Preloads office file pages to improve navigation performance by fetching
 * image data and storing it in an in-memory cache.
 *
 * The strategy is as follows:
 * - If on page 1, it preloads the next 5 pages.
 * - Otherwise, it preloads the previous 2 and next 4 pages.
 * @param allPages An array of all IWhiteboardFile objects for the document.
 * @param currentPage The current page number (1-based).
 */
export const preloadOfficeFilePages = (
  allPages: IWhiteboardFile[],
  currentPage: number,
) => {
  const pagesToPreload: number[] = [];
  const totalPages = allPages.length;

  if (currentPage === 1) {
    // If on the first page, preload the next 5 pages.
    for (let i = 1; i <= 5; i++) {
      const pageToLoad = currentPage + i;
      if (pageToLoad > totalPages) break;
      pagesToPreload.push(pageToLoad);
    }
  } else {
    // Preload the previous 2 pages.
    for (let i = 1; i <= 2; i++) {
      const pageToLoad = currentPage - i;
      if (pageToLoad < 1) break;
      pagesToPreload.push(pageToLoad);
    }

    // Preload the next 4 pages.
    for (let i = 1; i <= 4; i++) {
      const pageToLoad = currentPage + i;
      if (pageToLoad > totalPages) break;
      pagesToPreload.push(pageToLoad);
    }
  }

  // Filter out the current page and any pages that don't exist.
  const uniquePagesToPreload = [...new Set(pagesToPreload)].filter(
    (p) => p !== currentPage && p > 0 && p <= totalPages,
  );

  const preloadPromises = uniquePagesToPreload.map(async (pageNumber) => {
    const fileToPreload = allPages.find((p) => p.currentPage === pageNumber);
    if (!fileToPreload) {
      return;
    }

    const url =
      (window as any).PLUG_N_MEET_SERVER_URL +
      '/download/uploadedFile/' +
      fileToPreload.filePath;

    // If the image is already in our cache, we don't need to do anything.
    if (imageCache.has(url)) {
      return;
    }

    // Use the shared helper to fetch and cache the image. We don't need the result here.
    await fetchAndCacheImage(url);
  });

  // We run all promises concurrently but don't block the main thread.
  // This is a "fire and forget" for the batch with centralized error handling.
  Promise.all(preloadPromises).catch((e) => {
    console.error('An error occurred during page preloading:', e);
  });
};
