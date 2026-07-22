import {
  BinaryFileData,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types';
import {
  ExcalidrawImageElement,
  OrderedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';
import { getConfigValue, randomString } from '../../../helpers/utils';
import { RoomUploadedFileType } from 'plugnmeet-protocol-js';
import { store } from '../../../store';
import { uploadResumableFile } from '../../../helpers/fileUpload';
import {
  IWhiteboardFile,
  IWhiteboardOfficeFile,
  WhiteboardFileConversionRes,
  WhiteboardOfficePageMeta,
} from '../../../store/slices/interfaces/whiteboard';
import { DB_STORE_NAMES, idbGet, idbStore } from '../../../helpers/libs/idb';
import { addWhiteboardUploadedOfficeFile } from '../../../store/slices/whiteboard';
import { convertToExcalidrawElements } from '@excalidraw/excalidraw';
import {
  DEFAULT_A4_MARGIN,
  DEFAULT_PAGE_ORIENTATION,
  getPageSize,
  PageOrientation,
  pageSizeFromMetaPixels,
  resolvePageOrientation,
  VIRTUAL_WORKSPACE_WIDTH,
  VIRTUAL_WORKSPACE_HEIGHT,
} from '../export-pdf/types';

export interface FileReaderResult {
  image: BinaryFileData;
  elms: OrderedExcalidrawElement[];
}

export interface ImageCustomData {
  fileUrl: string;
  isOfficeFile: boolean;
  uploaderWhiteboardHeight?: number;
  uploaderWhiteboardWidth?: number;
  pageOrientation?: PageOrientation;
  /** Exact logical page size stamped when the image was placed (from page_N_meta.json). */
  pageWidth?: number;
  pageHeight?: number;
}

/** Exact page info for an office page (orientation + logical size). */
export interface OfficePageInfo {
  orientation: PageOrientation;
  pageWidth: number;
  pageHeight: number;
}

const processedImageElements: Map<string, string> = new Map();
const uploadPromises: Map<string, Promise<void>> = new Map();
const imageDataCache: Map<string, BinaryFileData> = new Map();

export const createAndRegisterOfficeFile = (
  whiteboardFileConversionRes: WhiteboardFileConversionRes,
  uploaderWhiteboardHeight = VIRTUAL_WORKSPACE_HEIGHT,
  uploaderWhiteboardWidth = VIRTUAL_WORKSPACE_WIDTH,
) => {
  const files: Array<IWhiteboardFile> = [];

  for (let i = 0; i < whiteboardFileConversionRes.totalPages; i++) {
    const pageNum = i + 1;
    const fileName = `page_${pageNum}.png`;
    const metaFileName = `page_${pageNum}_meta.json`;
    files.push({
      id: randomString(),
      currentPage: pageNum,
      filePath: `${whiteboardFileConversionRes.filePath}/${fileName}`,
      fileName,
      // Orientation always comes from this sidecar at page open time.
      metaFilePath: `${whiteboardFileConversionRes.filePath}/${metaFileName}`,
      uploaderWhiteboardHeight,
      uploaderWhiteboardWidth,
      isOfficeFile: true,
    });
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

const getDownloadBaseUrl = () =>
  getConfigValue<string>(
    'serverUrl',
    'http://localhost:8080',
    'PLUG_N_MEET_SERVER_URL',
  ) + '/download/uploadedFile/';

/** page_1.png path/url -> page_1_meta.json */
export const toOfficePageMetaPath = (imagePathOrUrl: string): string => {
  return imagePathOrUrl.replace(/\.png(\?.*)?$/i, '_meta.json$1');
};

/**
 * Loads page_N_meta.json written beside converted page images.
 * Multi-cluster safe: same download path / storage hooks as the PNGs.
 * Cached in IDB the same way as office page images.
 */
export const fetchOfficePageMeta = async (
  metaFilePathOrUrl: string,
): Promise<WhiteboardOfficePageMeta | null> => {
  const url = metaFilePathOrUrl.startsWith('http')
    ? metaFilePathOrUrl
    : getDownloadBaseUrl() + metaFilePathOrUrl;

  // 1. Check IDB cache first (same pattern as fetchAndCacheImage).
  const cached = await idbGet<WhiteboardOfficePageMeta>(
    DB_STORE_NAMES.OFFICE_PAGE_META_CACHE,
    url,
  );
  if (cached?.orientation) {
    return {
      ...cached,
      orientation: resolvePageOrientation(cached.orientation),
    };
  }

  let meta: WhiteboardOfficePageMeta | null = null;
  try {
    // 2. If not cached, fetch from the network.
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const raw = (await res.json()) as WhiteboardOfficePageMeta;
    if (!raw?.orientation) {
      return null;
    }
    meta = {
      ...raw,
      orientation: resolvePageOrientation(raw.orientation),
    };
  } catch (e) {
    console.warn('Failed to fetch office page meta', e);
  } finally {
    // 3. Cache successful fetches for later page opens / preload.
    if (meta) {
      await idbStore(DB_STORE_NAMES.OFFICE_PAGE_META_CACHE, url, meta);
    }
  }

  return meta;
};

const getBoundaryMetrics = (
  orientation: PageOrientation,
  pageWidth?: number,
  pageHeight?: number,
) => {
  const size =
    pageWidth && pageHeight
      ? { width: pageWidth, height: pageHeight }
      : getPageSize(orientation);
  const width = size.width - DEFAULT_A4_MARGIN;
  const height = size.height - DEFAULT_A4_MARGIN;
  return {
    width,
    height,
    startX: (VIRTUAL_WORKSPACE_WIDTH - width) / 2,
    startY: (VIRTUAL_WORKSPACE_HEIGHT - height) / 2,
  };
};

const parsePageFiles = (pageFilesJson?: string | null): IWhiteboardFile[] => {
  if (!pageFilesJson) {
    return [];
  }
  try {
    const pages = JSON.parse(pageFilesJson) as IWhiteboardFile[];
    return Array.isArray(pages) ? pages : [];
  } catch {
    return [];
  }
};

const defaultOfficePageInfo = (): OfficePageInfo => {
  const size = getPageSize(DEFAULT_PAGE_ORIENTATION);
  return {
    orientation: DEFAULT_PAGE_ORIENTATION,
    pageWidth: size.width,
    pageHeight: size.height,
  };
};

/**
 * Always loads page_N_meta.json for office pages.
 * Frame size = standard A4 long side + the page's real aspect ratio
 * (A4 pages map to the exact standard A4 frames);
 * falls back to portrait A4 if meta cannot be fetched.
 */
export const resolveOfficePageInfo = async (
  metaFilePath?: string,
  imageFilePathOrUrl?: string,
): Promise<OfficePageInfo> => {
  const metaPath =
    metaFilePath ||
    (imageFilePathOrUrl ? toOfficePageMetaPath(imageFilePathOrUrl) : undefined);

  if (!metaPath) {
    return defaultOfficePageInfo();
  }

  const meta = await fetchOfficePageMeta(metaPath);
  if (!meta) {
    return defaultOfficePageInfo();
  }

  const orientation = resolvePageOrientation(meta.orientation);
  const size =
    pageSizeFromMetaPixels(meta.width, meta.height) ?? getPageSize(orientation);

  return {
    orientation,
    pageWidth: size.width,
    pageHeight: size.height,
  };
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
  const cachedImage = await idbGet<string>(DB_STORE_NAMES.IMAGE_CACHE, url);
  if (cachedImage) {
    return cachedImage;
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
      await idbStore(DB_STORE_NAMES.IMAGE_CACHE, url, base64);
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
  metaFilePath?: string,
): Promise<FileReaderResult | null> => {
  try {
    // Office pages: always fetch page_N_meta.json (exact size; default portrait A4 if missing).
    const pageInfoPromise = is_office_file
      ? resolveOfficePageInfo(metaFilePath, url)
      : Promise.resolve(defaultOfficePageInfo());

    // Use the shared helper to get the image data from cache or network.
    const [imgData, pageInfo] = await Promise.all([
      fetchAndCacheImage(url),
      pageInfoPromise,
    ]);

    if (!imgData) {
      // If fetching/caching failed, stop here.
      return null;
    }

    const fileMimeType = imgData.substring(
      'data:'.length,
      imgData.indexOf(';base64'),
    );

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

      const boundary = getBoundaryMetrics(
        pageInfo.orientation,
        pageInfo.pageWidth,
        pageInfo.pageHeight,
      );

      const { fileHeight, fileWidth } = getFileDimension(
        image.height,
        image.width,
        boundary.width,
        boundary.height,
      );

      return prepareForExcalidraw(
        file_id,
        url,
        imgData,
        fileMimeType,
        fileHeight,
        fileWidth,
        is_office_file,
        uploaderWhiteboardHeight,
        uploaderWhiteboardWidth,
        pageInfo,
      );
    } else if (fileMimeType === 'image/svg+xml') {
      const boundary = getBoundaryMetrics(
        pageInfo.orientation,
        pageInfo.pageWidth,
        pageInfo.pageHeight,
      );
      const fileWidth = boundary.width * 0.9;
      const fileHeight = fileWidth * (boundary.height / boundary.width);

      return prepareForExcalidraw(
        file_id,
        url,
        imgData,
        fileMimeType,
        fileHeight,
        fileWidth,
        is_office_file,
        uploaderWhiteboardHeight,
        uploaderWhiteboardWidth,
        pageInfo,
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
  isOfficeFile: boolean,
  uploaderWhiteboardHeight?: number,
  uploaderWhiteboardWidth?: number,
  pageInfo: OfficePageInfo = defaultOfficePageInfo(),
): FileReaderResult => {
  const image: BinaryFileData = {
    id: fileId as BinaryFileData['id'],
    dataURL: imgData as BinaryFileData['dataURL'],
    mimeType: fileMimeType as BinaryFileData['mimeType'],
    created: Date.now(),
  };

  // Get target A4 bounding box properties matching prepareA4BoundaryGuide
  const {
    width: targetBoundaryWidth,
    height: targetBoundaryHeight,
    startX: boundaryStartX,
    startY: boundaryStartY,
  } = getBoundaryMetrics(
    pageInfo.orientation,
    pageInfo.pageWidth,
    pageInfo.pageHeight,
  );

  // Center horizontally; pin office pages to the top of the guide so landscape
  // (and letterboxed) pages don't leave a large empty band above the content.
  const imageX = boundaryStartX + (targetBoundaryWidth - fileWidth) / 2;
  const imageY = isOfficeFile
    ? boundaryStartY
    : boundaryStartY + (targetBoundaryHeight - fileHeight) / 2;

  const elms = convertToExcalidrawElements([
    {
      fileId: image.id,
      type: 'image',
      x: imageX,
      y: imageY,
      width: fileWidth,
      height: fileHeight,
      locked: isOfficeFile,
      status: 'saved',
      customData: {
        fileUrl,
        isOfficeFile,
        uploaderWhiteboardHeight,
        uploaderWhiteboardWidth,
        pageOrientation: pageInfo.orientation,
        pageWidth: pageInfo.pageWidth,
        pageHeight: pageInfo.pageHeight,
      },
    },
  ]);

  return {
    image,
    elms,
  };
};

/** Resolve exact page info for an office page by always fetching its meta file. */
export const getOfficePageInfo = async (
  pageNumber: number,
  pageFilesJson?: string,
): Promise<OfficePageInfo> => {
  const pages = parsePageFiles(
    pageFilesJson ?? store.getState().whiteboard.currentOfficeFilePages,
  );
  const page = pages.find((p) => p.currentPage === pageNumber);
  if (!page?.isOfficeFile) {
    return defaultOfficePageInfo();
  }
  return resolveOfficePageInfo(page.metaFilePath, page.filePath);
};

const getFileDimension = (
  height: number,
  width: number,
  targetWidth: number,
  targetHeight: number,
) => {
  // If the image already fits inside both bounds, no scaling is needed.
  if (width <= targetWidth && height <= targetHeight) {
    return { fileHeight: height, fileWidth: width };
  }

  // Calculate scale ratios for both dimensions and pick the most restrictive one (Math.min)
  const widthRatio = targetWidth / width;
  const heightRatio = targetHeight / height;
  const scaleRatio = Math.min(widthRatio, heightRatio);

  return {
    fileHeight: height * scaleRatio,
    fileWidth: width * scaleRatio,
  };
};

const dataURLtoFile = (dataUrl: string, filename: string): File | null => {
  const arr = dataUrl.split(',');
  if (!arr[0]) return null;

  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) return null;

  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export const uploadCanvasBinaryFile = (
  elm: ExcalidrawImageElement,
  file: BinaryFileData,
  excalidrawAPI?: ExcalidrawImperativeAPI,
) => {
  // This ensures concurrent calls wait for the same upload.
  if (uploadPromises.has(file.id)) {
    return;
  }

  // Create a new promise that encapsulates the entire upload process.
  const uploadPromise = new Promise<void>((resolve, reject) => {
    try {
      const imageFile = dataURLtoFile(file.dataURL, `${file.id}.png`);
      if (!imageFile) {
        // If conversion fails, reject the promise.
        console.error('Failed to convert canvas data to a file.');
        return reject(new Error('Failed to convert canvas data to a file.'));
      }

      uploadResumableFile(
        [],
        undefined,
        RoomUploadedFileType.WHITEBOARD_IMAGE_FILE,
        [imageFile],
        (res) => {
          // This is the onSuccess callback
          if (!res.status || !res.filePath) {
            console.error('Failed to upload canvas binary file.');
            return reject(new Error('Upload failed.'));
          }

          const fileUrl =
            getConfigValue<string>(
              'serverUrl',
              'http://localhost:8080',
              'PLUG_N_MEET_SERVER_URL',
            ) +
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
          // Resolve the promise on success.
          resolve();
        },
        undefined, // isUploading
        undefined, // uploadingProgress
        (errorMsg) => {
          // Reject the promise on error.
          console.error('Error during canvas file upload:', errorMsg);
          reject(new Error(errorMsg));
        },
      );
    } catch (error) {
      // Reject the promise if any synchronous error occurs.
      console.error('Error preparing canvas file for upload:', error);
      reject(error);
    }
  });

  // **Immediately** store the promise in the map. This is the atomic part.
  uploadPromises.set(file.id, uploadPromise);

  // When the promise is settled (either success or failure),
  // remove it from the map so a re-upload can be attempted later if needed.
  uploadPromise.finally(() => {
    uploadPromises.delete(file.id);
  });

  // Return the newly created promise.
  return uploadPromise;
};

export const getImageData = async (
  elm: ExcalidrawImageElement,
  customData: ImageCustomData,
): Promise<BinaryFileData | null> => {
  if (!elm.fileId || !customData.fileUrl) {
    return null;
  }

  const cached = imageDataCache.get(elm.fileId);
  if (cached) {
    return cached;
  }

  const result = await fetchFileWithElm(
    customData.fileUrl,
    elm.fileId,
    customData.isOfficeFile,
    customData.uploaderWhiteboardHeight,
    customData.uploaderWhiteboardWidth,
    customData.isOfficeFile
      ? toOfficePageMetaPath(customData.fileUrl)
      : undefined,
  );

  if (result) {
    imageDataCache.set(elm.fileId, result.image);
    return result.image;
  }

  return null;
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

  const imageData = await getImageData(elm, customData);
  if (!imageData) {
    console.error('fetching image file failed', customData.fileUrl);
    processedImageElements.delete(elm.id);
    return;
  }

  excalidrawAPI.addFiles([imageData]);
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

    const url = getDownloadBaseUrl() + fileToPreload.filePath;

    // Prefetch image + page meta (meta is required for office page size).
    await Promise.all([
      fetchAndCacheImage(url),
      fileToPreload.isOfficeFile
        ? resolveOfficePageInfo(
            fileToPreload.metaFilePath,
            fileToPreload.filePath,
          )
        : Promise.resolve(defaultOfficePageInfo()),
    ]);
  });

  // We run all promises concurrently but don't block the main thread.
  // This is a "fire and forget" for the batch with centralized error handling.
  Promise.all(preloadPromises).catch((e) => {
    console.error('An error occurred during page preloading:', e);
  });
};
