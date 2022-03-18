// eslint-disable-next-line import/no-unresolved
import { BinaryFileData, DataURL } from '@excalidraw/excalidraw/types/types';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';

export interface FileReaderResult {
  image: BinaryFileData;
  elm: ExcalidrawElement;
}

let fileName = '',
  fileMimeType = '',
  imgData = '',
  fileHeight = 50,
  fileWidth = 50;

export const getFile = async (url, file_name) => {
  return new Promise(async (resolve, reject) => {
    const res = await fetch(url);
    const imageData = await res.blob();
    if (!imageData) {
      reject(null);
    }

    fileName = file_name;
    const reader = new FileReader();
    const readerBase64 = new FileReader();

    reader.onloadend = () => {
      fileMimeType = getRealMimeType(reader);
      if (fileMimeType !== 'unknown') {
        readerBase64.readAsDataURL(imageData);
      } else {
        reject(null);
      }
    };
    reader.readAsArrayBuffer(imageData);

    readerBase64.onload = () => {
      imgData = readerBase64.result as string;
      if (fileMimeType !== 'image/svg+xml') {
        const image = new Image();
        image.src = imgData;

        image.onload = function () {
          fileHeight = image.height;
          fileWidth = image.width;
          if (fileHeight > 100) {
            fileHeight = image.height * 0.2;
            fileWidth = image.width * 0.2;
          }
          const result = prepareForExcalidraw();
          resolve(result);
        };
      } else {
        const result = prepareForExcalidraw();
        resolve(result);
      }
    };
  });
};

const prepareForExcalidraw = (): FileReaderResult => {
  const image: BinaryFileData = {
    id: fileName as any,
    dataURL: imgData as DataURL,
    mimeType: fileMimeType as any,
    created: Date.now(),
  };

  const elm: ExcalidrawElement = {
    id: fileName,
    type: 'image',
    x: 100,
    y: 100,
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
    strokeSharpness: 'round',
    seed: Date.now(),
    version: 4,
    versionNonce: Date.now(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    status: 'pending',
    fileId: fileName as any,
    scale: [1, 1],
  };

  return {
    image,
    elm,
  };
};

const getRealMimeType = (reader) => {
  const arr = new Uint8Array(reader.result).subarray(0, 4);
  let header = '';
  let realMimeType;

  for (let i = 0; i < arr.length; i++) {
    header += arr[i].toString(16);
  }

  // magic numbers: http://www.garykessler.net/library/file_sigs.html
  switch (header) {
    case '89504e47':
      realMimeType = 'image/png';
      break;
    case '47494638':
      realMimeType = 'image/gif';
      break;
    case 'ffd8ffDB':
    case 'ffd8ffe0':
    case 'ffd8ffe1':
    case 'ffd8ffe2':
    case 'ffd8ffe3':
    case 'ffd8ffe8':
      realMimeType = 'image/jpeg';
      break;
    case '3c3f786d':
    case '3c737667':
      realMimeType = 'image/svg+xml';
      break;
    default: // Or you can use the blob.type as fallback
      realMimeType = 'unknown';
      break;
  }

  return realMimeType;
};
