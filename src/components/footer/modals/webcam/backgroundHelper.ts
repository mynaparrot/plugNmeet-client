import { getConfigValue } from '../../../../helpers/utils';

const assetPath = getConfigValue(
  'staticAssetsPath',
  './assets',
  'STATIC_ASSETS_PATH',
);

const DEFAULT_BACKGROUND_IMAGE_URLS = [
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

// Sync defaults for initial render; config URLs load via loadBackgroundImageUrls().
const backgroundImageUrls = DEFAULT_BACKGROUND_IMAGE_URLS;

const loadBackgroundImageUrls = async (): Promise<string[]> => {
  const bgImgUrlsFromCnf = getConfigValue<string[] | undefined>(
    'virtualBackgroundImages',
    undefined,
    'PNM_VIRTUAL_BG_IMGS',
  );

  if (
    !bgImgUrlsFromCnf ||
    !Array.isArray(bgImgUrlsFromCnf) ||
    bgImgUrlsFromCnf.length === 0
  ) {
    return DEFAULT_BACKGROUND_IMAGE_URLS;
  }

  const imgUrls: Array<string> = [];
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

  return imgUrls.length ? imgUrls : DEFAULT_BACKGROUND_IMAGE_URLS;
};

export { backgroundImageUrls, loadBackgroundImageUrls };
