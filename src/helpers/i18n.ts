import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

declare const IS_PRODUCTION: boolean;
const assetPath = (window as any).STATIC_ASSETS_PATH ?? '/assets';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(HttpApi)
  .init({
    debug: !IS_PRODUCTION,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    backend: {
      loadPath: assetPath + '/locales/{{lng}}/{{ns}}.json',
    },
  });

export default i18n;
