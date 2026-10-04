import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';
import { getConfigValue } from './utils';
import languages from './languages';

declare const IS_PRODUCTION: boolean;
const assetPath = getConfigValue('staticAssetsPath', '/assets', 'STATIC_ASSETS_PATH');

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(HttpApi)
  .init({
    debug: !IS_PRODUCTION,
    fallbackLng: 'en',
    // Restrict resolution to locale folders we actually ship. Without this,
    // mobile browsers reporting region variants (e.g. en-US, de-DE vs de)
    // leave i18n.languages[0] as the raw variant, which matches no dropdown
    // option and renders the button blank on first open.
    supportedLngs: languages.map((l) => l.code),
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    backend: {
      loadPath: assetPath + '/locales/{{lng}}/{{ns}}.json',
    },
  });

export default i18n;
