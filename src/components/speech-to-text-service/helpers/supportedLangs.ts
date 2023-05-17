export type SupportedLangs = {
  name: string;
  code: string;
};

const supportedSpeechToTextLangs = [
  { name: 'English', code: 'en-US' },
  { name: 'Arabic', code: 'ar-BH' },
  { name: 'Danish', code: 'da-DK' },
  { name: 'German', code: 'de-DE' },
  { name: 'Spanish', code: 'es-ES' },
  { name: 'French', code: 'fr-FR' },
  { name: 'Italian', code: 'it-IT' },
  { name: 'Dutch', code: 'nl-NL' },
  { name: 'Portuguese', code: 'pt-PT' },
  { name: 'Polish', code: 'pl-PL' },
  { name: 'Russian', code: 'ru-RU' },
  { name: 'Turkish', code: 'tr-TR' },
  { name: 'Japanese', code: 'ja-JP' },
  { name: 'Korean', code: 'ko-KR' },
  { name: 'Swedish', code: 'sv-SE' },
  { name: 'Finnish', code: 'fi-FI' },
  { name: 'Thai', code: 'th-TH' },
  { name: 'Norwegian', code: 'nb-NO' },
  { name: 'Hindi (India)', code: 'hi-IN' },
  { name: 'Chinese (Mandarin, Simplified)', code: 'zh-CN' },
  { name: 'Chinese (Taiwanese Mandarin)', code: 'zh-TW' },
];

const supportedTranslationLangs = [
  { name: 'Arabic', code: 'ar' },
  { name: 'Bangla', code: 'bn' },
  { name: 'Catalan', code: 'ca' },
  { name: 'Danish', code: 'da' },
  { name: 'German', code: 'de' },
  { name: 'English', code: 'en' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Spanish', code: 'es' },
  { name: 'Finnish', code: 'fi' },
  { name: 'French', code: 'fr' },
  { name: 'Italian', code: 'it' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Korean', code: 'ko' },
  { name: 'Norwegian', code: 'nb' },
  { name: 'Dutch', code: 'nl' },
  { name: 'Polish', code: 'pl' },
  { name: 'Portuguese', code: 'pt' },
  { name: 'Turkish', code: 'tr' },
  { name: 'Russian', code: 'ru' },
  { name: 'Swedish', code: 'sv' },
  { name: 'Thai', code: 'th' },
  { name: 'Chinese Simplified', code: 'zh-Hans' },
  { name: 'Chinese Traditional', code: 'zh-Hant' },
];

export { supportedSpeechToTextLangs, supportedTranslationLangs };
