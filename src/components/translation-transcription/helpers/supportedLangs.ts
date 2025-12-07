import { once } from 'es-toolkit';
import {
  InsightsServiceType,
  InsightsSupportedLangInfo,
} from 'plugnmeet-protocol-js';

import { getSupportedLanguages } from './apiConnections';
import { store } from '../../../store';
import i18n from '../../../helpers/i18n';

export type SupportedLangs = {
  name: string;
  code: string;
};

// Create Maps for efficient lookups (O(1) complexity)
const speechLangsMap = new Map<string, InsightsSupportedLangInfo>();
//supportedSpeechToTextLangs.map((lang) => [lang.code, lang]),
const translationLangsMap = new Map<string, InsightsSupportedLangInfo>();
// supportedTranslationLangs.map((lang) => [lang.code, lang]),

const getSubtitleLangs = (
  speechLangs?: string[],
  transLangs?: string[],
): Array<SupportedLangs> => {
  // If the language lists are not provided, fall back to the Redux store.
  if (!speechLangs || !transLangs) {
    const transcriptionFeatures =
      store.getState().session.currentRoom.metadata?.roomFeatures
        ?.insightsFeatures?.transcriptionFeatures;
    if (!speechLangs) {
      speechLangs = transcriptionFeatures?.allowedSpokenLangs;
    }
    if (!transLangs) {
      transLangs = transcriptionFeatures?.allowedTransLangs;
    }
  }

  const uniqueLangCodes = new Set<string>();

  // 1. Get unique locale codes from the allowed speech languages
  speechLangs?.forEach((code) => {
    const speechLang = speechLangsMap.get(code);
    if (speechLang) {
      uniqueLangCodes.add(speechLang.locale);
    }
  });

  // 2. Add the allowed translation languages
  transLangs?.forEach((code) => {
    uniqueLangCodes.add(code);
  });

  // 3. Build the final list of language objects
  const availableLangs = Array.from(uniqueLangCodes)
    .map((code) => translationLangsMap.get(code))
    .filter((lang): lang is InsightsSupportedLangInfo => !!lang);

  // 4. Prepend the "Select" option and return
  return [
    {
      name: i18n.t('speech-services.select-one-lang'),
      code: '',
    },
    ...availableLangs,
  ];
};

export const supportedTranscriptionLangs = once(async () => {
  const res = await getSupportedLanguages(InsightsServiceType.TRANSCRIPTION);
  if (res.status) {
    return res.languages.map((l) => {
      speechLangsMap.set(l.code, l);
      return {
        value: l.code,
        text: l.name,
      };
    });
  }
  return [];
});

export const supportedTranslationLangs = once(async () => {
  const res = await getSupportedLanguages(InsightsServiceType.TRANSLATION);
  if (res.status) {
    return res.languages.map((l) => {
      translationLangsMap.set(l.code, l);
      return {
        value: l.code,
        text: l.name,
      };
    });
  }
  return [];
});

export { speechLangsMap, translationLangsMap, getSubtitleLangs };
