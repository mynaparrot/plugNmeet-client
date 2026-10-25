import { createInstance, type i18n as I18nInstance } from 'i18next';
import en from '../../../../assets/locales/en/translation.json';

/**
 * Standalone i18next instance for the export-hub builders: real English copy,
 * without browser language detection or the HTTP backend.
 */
export const createTestI18n = async (): Promise<I18nInstance> => {
  const instance = createInstance();
  await instance.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
  return instance;
};

export const exportHubT = (
  instance: I18nInstance,
  key: string,
  options?: Record<string, unknown>,
): string => instance.t(`export-hub.${key}`, options);
