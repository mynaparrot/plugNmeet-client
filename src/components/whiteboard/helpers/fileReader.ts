// eslint-disable-next-line import/no-unresolved
import { BinaryFileData, DataURL } from '@excalidraw/excalidraw/types/types';
import { randomInteger } from '../../../helpers/utils';
import {
  ExcalidrawElement,
  ExcalidrawImageElement,
  // eslint-disable-next-line import/no-unresolved
} from '@excalidraw/excalidraw/types/element/types';

export interface FileReaderResult {
  image: BinaryFileData;
  elm: ExcalidrawElement;
}

let fileId = '',
  fileMimeType = '',
  imgData = '',
  fileHeight: number,
  fileWidth: number,
  lastVersion,
  excalidrawHeight,
  excalidrawWidth,
  isOfficeFile = false;

export const fetchFileWithElm = async (
  url: string,
  file_id: string,
  last_version: number,
  is_office_file: boolean,
  uploaderWhiteboardHeight?: number,
  uploaderWhiteboardWidth?: number,
) => {
  return new Promise<FileReaderResult>(async (resolve, reject) => {
    const res = await fetch(url);
    const imageData = await res.blob();
    if (!imageData) {
      reject(null);
    }

    fileId = file_id;
    lastVersion = last_version;
    excalidrawHeight = uploaderWhiteboardHeight;
    excalidrawWidth = uploaderWhiteboardWidth;
    isOfficeFile = is_office_file;
    if (lastVersion < 0) {
      lastVersion = 1;
    }
    const readerBase64 = new FileReader();
    readerBase64.readAsDataURL(imageData);

    readerBase64.onload = () => {
      imgData = readerBase64.result as string;
      fileMimeType = imgData.substring(
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

        image.onload = async function () {
          await getFileDimension(image.height, image.width);
          const result = prepareForExcalidraw();
          resolve(result);
        };

        image.onerror = async function () {
          console.error('can not open image file');
          reject(null);
        };
      } else if (fileMimeType == 'image/svg+xml') {
        fileHeight = excalidrawHeight * 0.8;
        fileWidth = excalidrawWidth * 0.7;
        const result = prepareForExcalidraw();
        resolve(result);
      } else {
        console.error('unsupported file');
        reject(null);
      }
    };
  });
};

const prepareForExcalidraw = (): FileReaderResult => {
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

  const elm: ExcalidrawImageElement = {
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
    version: lastVersion + 1,
    versionNonce: randomInteger(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    status: 'pending',
    fileId: fileId as any,
    scale: [1, 1],
    locked: isOfficeFile, // if office file then lock it by default.
    frameId: null,
  };

  return {
    image,
    elm,
  };
};

const getFileDimension = async (height: number, width: number) => {
  fileHeight = Number(`${height}`);
  fileWidth = Number(`${width}`);

  const excalidrawActualWidth = excalidrawWidth - 150;
  const reducedBy = 0.01;

  while (fileWidth > excalidrawActualWidth) {
    fileHeight -= fileHeight * reducedBy;
    fileWidth -= fileWidth * reducedBy;
  }
};
