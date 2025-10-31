import { getConfigValue } from '../../../helpers/utils';

export type BackgroundConfig = {
  type: 'none' | 'blur-sm' | 'image';
  url?: string;
};

const defaultBackgroundConfig: BackgroundConfig = {
  type: 'none',
};

const assetPath = getConfigValue(
  'staticAssetsPath',
  './assets',
  'STATIC_ASSETS_PATH',
);

let backgroundImageUrls = [
  'kenny-eliason-Wp7t4cWN-68-unsplash',
  'jonny-caspari-KuudDjBHIlA-unsplash',
  'roman-bozhko-PypjzKTUqLo-unsplash',
  'vinicius-amnx-amano-17NCG_wOkMY-unsplash',
  'dmytro-tolokonov-Jq3WI9IQgEs-unsplash',
  'andrew-ridley-jR4Zf-riEjI-unsplash',
  'annie-spratt-OWq8w3BYMFY-unsplash',
  'evelyn-bertrand-GrIf347OtnY-unsplash',
  'steve-richey-6xqAK6oAeHA-unsplash',
].map((imageName) => `${assetPath}/backgrounds/${imageName}.jpg`);

const bgImgUrlsFromCnf = getConfigValue<string[] | undefined>(
  'virtualBackgroundImages',
  undefined,
  'PNM_VIRTUAL_BG_IMGS',
);

if (
  bgImgUrlsFromCnf &&
  Array.isArray(bgImgUrlsFromCnf) &&
  bgImgUrlsFromCnf.length > 0
) {
  const imgUrls: Array<string> = [];

  (async () => {
    for (let i = 0; i < bgImgUrlsFromCnf.length; i++) {
      const url = bgImgUrlsFromCnf[i];
      try {
        const req = await fetch(url, { method: 'HEAD' });
        if (req.ok) {
          imgUrls.push(url);
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (imgUrls.length) {
      backgroundImageUrls = imgUrls;
    }
  })();
}

export { backgroundImageUrls, defaultBackgroundConfig };
