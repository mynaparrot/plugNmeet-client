export type SourceConfig = {
  type: 'image' | 'video' | 'camera';
  url?: string;
};

export type SourcePlayback = {
  htmlElement: HTMLImageElement | HTMLVideoElement;
  width: number;
  height: number;
};

const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

export const sourceImageUrls = [
  'girl-919048_1280',
  'doctor-5871743_640',
  'woman-5883428_1280',
].map((imageName) => `${assetPath}/images/${imageName}.jpg`);

export const sourceVideoUrls = [
  'Dance - 32938',
  'Doctor - 26732',
  'Thoughtful - 35590',
].map((videoName) => `${assetPath}/videos/${videoName}.mp4`);
