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

// A simple in-memory cache to store fetched image data (base64) by URL.
const imageCache = new Map<string, string>(),
  uploadingCanvasBinaryFile: Map<string, string> = new Map(),
  processedImageElements: Map<string, string> = new Map();

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

export const fetchFileWithElm = async (
  url: string,
  file_id: string,
  is_office_file: boolean,
  uploaderWhiteboardHeight?: number,
  uploaderWhiteboardWidth?: number,
): Promise<FileReaderResult | null> => {
  try {
    let imgData: string;

    if (imageCache.has(url)) {
      // Cache hit: Use the cached base64 data.
      imgData = imageCache.get(url)!;
    } else {
      // Cache miss: Fetch the file and convert it to base64.
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed to fetch file from ${url}: ${res.statusText}`);
        return null;
      }
      const imageData = await res.blob();
      imgData = (await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageData);
      })) as string;
      // Store the result in the cache for future use.
      imageCache.set(url, imgData);
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

  const percent = Math.round((fileWidth * 100) / excalidrawWidth);
  let reducedBy = 0.4;
  if (percent < 50) {
    reducedBy = 0.7;
  }

  const customData: ImageCustomData = {
    fileUrl,
    isOfficeFile,
    uploaderWhiteboardHeight,
    uploaderWhiteboardWidth,
  };

  let elm: ExcalidrawImageElement = {
    id: fileId,
    type: 'image',
    x: excalidrawHeight * reducedBy,
    y: excalidrawWidth * 0.06,
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
    customData,
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

  let fileExist = false;
  const canvasFiles = excalidrawAPI.getFiles();
  for (const canvasFile in canvasFiles) {
    if (canvasFiles[canvasFile].id === elm.fileId) {
      fileExist = true;
      break;
    }
  }

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
