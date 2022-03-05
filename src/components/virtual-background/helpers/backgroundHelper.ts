export type BackgroundConfig = {
  type: 'none' | 'blur' | 'image';
  url?: string;
};

export const defaultBackgroundConfig: BackgroundConfig = {
  type: 'none',
};

const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

export const backgroundImageUrls = [
  'architecture-5082700_1280',
  'porch-691330_1280',
  'saxon-switzerland-539418_1280',
  'shibuyasky-4768679_1280',
].map((imageName) => `${assetPath}/backgrounds/${imageName}.jpg`);
