export const getSupportedMimeType = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined') {
    return undefined;
  }

  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];

  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
};

export const getFileExtension = (mimeType: string): string => {
  if (mimeType.includes('mp4')) {
    return 'mp4';
  }

  return 'webm';
};

export const getSafeFileName = (roomId: string, mimeType: string): string => {
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  const extension = getFileExtension(mimeType);

  return `${roomId}_${timestamp}.${extension}`;
};
