export type BackgroundConfig = {
  type: 'none' | 'blur' | 'image';
  url?: string;
};

export const defaultBackgroundConfig: BackgroundConfig = {
  type: 'none',
};

const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

export const backgroundImageUrls = [
  'kenny-eliason-Wp7t4cWN-68-unsplash',
  'jonny-caspari-KuudDjBHIlA-unsplash',
  'roman-bozhko-PypjzKTUqLo-unsplash',
  'vinicius-amnx-amano-17NCG_wOkMY-unsplash',
  'dmytro-tolokonov-Jq3WI9IQgEs-unsplash',
  'andrew-ridley-jR4Zf-riEjI-unsplash',
  'annie-spratt-OWq8w3BYMFY-unsplash',
  'evelyn-bertrand-GrIf347OtnY-unsplash',
  'steve-richey-6xqAK6oAeHA-unsplash',
  'erol-ahmed-IHL-Jbawvvo-unsplash',
].map((imageName) => `${assetPath}/backgrounds/${imageName}.jpg`);
