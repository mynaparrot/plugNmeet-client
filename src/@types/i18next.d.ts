import 'i18next';
import en from '../assets/locales/en/translation.json';

const defaultResource = { translation: en };

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: typeof defaultResource;
  }
}
