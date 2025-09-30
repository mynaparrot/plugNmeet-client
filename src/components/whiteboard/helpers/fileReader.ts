import { BinaryFileData, DataURL } from '@excalidraw/excalidraw/types';
import {
  ExcalidrawElement,
  ExcalidrawImageElement,
} from '@excalidraw/excalidraw/element/types';
import { randomInteger } from '../../../helpers/utils';

export interface FileReaderResult {
  image: BinaryFileData;
  elm: ExcalidrawElement;
}

export const fetchFileWithElm = async (
  url: string,
  file_id: string,
  is_office_file: boolean,
  uploaderWhiteboardHeight?: number,
  uploaderWhiteboardWidth?: number,
  excalidrawElement?: ExcalidrawElement,
): Promise<FileReaderResult | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch file from ${url}: ${res.statusText}`);
      return null;
    }
    const imageData = await res.blob();

    const imgData = (await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(imageData);
    })) as string;

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
        imgData,
        fileMimeType,
        fileHeight,
        fileWidth,
        excalidrawHeight,
        excalidrawWidth,
        is_office_file,
        excalidrawElement,
      );
    } else if (fileMimeType === 'image/svg+xml') {
      const fileHeight = excalidrawHeight * 0.8;
      const fileWidth = excalidrawWidth * 0.7;
      return prepareForExcalidraw(
        file_id,
        imgData,
        fileMimeType,
        fileHeight,
        fileWidth,
        excalidrawHeight,
        excalidrawWidth,
        is_office_file,
        excalidrawElement,
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
  imgData: string,
  fileMimeType: string,
  fileHeight: number,
  fileWidth: number,
  excalidrawHeight: number,
  excalidrawWidth: number,
  isOfficeFile: boolean,
  excalidrawElement?: ExcalidrawElement,
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
  };

  if (
    typeof excalidrawElement !== 'undefined' &&
    excalidrawElement.type === 'image'
  ) {
    elm = excalidrawElement;
  }

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
