import { store } from '../../../store';
import i18n from '../../../helpers/i18n';

export type SupportedLangs = {
  name: string;
  code: string;
};

const supportedSpeechToTextLangs = [
  { name: 'Afrikaans', code: 'af-ZA', locale: 'af' },
  { name: 'Amharic', code: 'am-ET', locale: 'am' },
  { name: 'Arabic (United Arab Emirates)', code: 'ar-AE', locale: 'ar' },
  { name: 'Arabic (Bahrain)', code: 'ar-BH', locale: 'ar' },
  { name: 'Arabic (Algeria)', code: 'ar-DZ', locale: 'ar' },
  { name: 'Arabic (Egypt)', code: 'ar-EG', locale: 'ar' },
  { name: 'Arabic (Israel)', code: 'ar-IL', locale: 'ar' },
  { name: 'Arabic (Iraq)', code: 'ar-IQ', locale: 'ar' },
  { name: 'Arabic (Jordan)', code: 'ar-JO', locale: 'ar' },
  { name: 'Arabic (Kuwait)', code: 'ar-KW', locale: 'ar' },
  { name: 'Arabic (Lebanon)', code: 'ar-LB', locale: 'ar' },
  { name: 'Arabic (Libya)', code: 'ar-LY', locale: 'ar' },
  { name: 'Arabic (Morocco)', code: 'ar-MA', locale: 'ar' },
  { name: 'Arabic (Oman)', code: 'ar-OM', locale: 'ar' },
  { name: 'Arabic (Palestinian Territories)', code: 'ar-PS', locale: 'ar' },
  { name: 'Arabic (Qatar)', code: 'ar-QA', locale: 'ar' },
  { name: 'Arabic (Saudi Arabia)', code: 'ar-SA', locale: 'ar' },
  { name: 'Arabic (Syria)', code: 'ar-SY', locale: 'ar' },
  { name: 'Arabic (Tunisia)', code: 'ar-TN', locale: 'ar' },
  { name: 'Arabic (Yemen)', code: 'ar-YE', locale: 'ar' },
  { name: 'Azerbaijani', code: 'az-AZ', locale: 'az' },
  { name: 'Armenian', code: 'hy-AM', locale: 'hy' },
  { name: 'Albanian', code: 'sq-AL', locale: 'sq' },
  { name: 'Bulgarian', code: 'bg-BG', locale: 'bg' },
  { name: 'Bengali (india)', code: 'bn-IN', locale: 'bn' },
  { name: 'Bosnian', code: 'bs-BA', locale: 'bs' },
  { name: 'Basque', code: 'eu-ES', locale: 'eu' },
  { name: 'Burmese', code: 'my-MM', locale: 'my' },
  { name: 'Catalan', code: 'ca-ES', locale: 'ca' },
  { name: 'Czech', code: 'cs-CZ', locale: 'cs' },
  { name: 'Croatian', code: 'hr-HR', locale: 'hr' },
  { name: 'Chinese (Mandarin, Simplified)', code: 'zh-CN', locale: 'zh-Hans' },
  { name: 'Chinese (Taiwanese Mandarin)', code: 'zh-TW', locale: 'zh-Hant' },
  { name: 'Chinese (Wu, Simplified)', code: 'wuu-CN', locale: 'zh-Hans' },
  {
    name: 'Chinese (Cantonese, Simplified)',
    code: 'yue-CN',
    locale: 'zh-Hant',
  },
  {
    name: 'Chinese (Jilu Mandarin, Simplified)',
    code: 'zh-CN-shandong',
    locale: 'zh-Hans',
  },
  {
    name: 'Chinese (Southwestern Mandarin, Simplified)',
    code: 'zh-CN-sichuan',
    locale: 'zh-Hans',
  },
  {
    name: 'Chinese (Cantonese, Traditional)',
    code: 'zh-HK',
    locale: 'zh-Hant',
  },
  { name: 'Danish', code: 'da-DK', locale: 'da' },
  { name: 'Dutch (Belgium)', code: 'nl-BE', locale: 'nl' },
  { name: 'Dutch (Netherlands)', code: 'nl-NL', locale: 'nl' },
  { name: 'English (Australia)', code: 'en-AU', locale: 'en' },
  { name: 'English (US)', code: 'en-US', locale: 'en' },
  { name: 'English (UK)', code: 'en-GB', locale: 'en' },
  { name: 'English (Canada)', code: 'en-CA', locale: 'en' },
  { name: 'English (Ghana)', code: 'en-GH', locale: 'en' },
  { name: 'English (Hong Kong SAR)', code: 'en-HK', locale: 'en' },
  { name: 'English (Ireland)', code: 'en-IE', locale: 'en' },
  { name: 'English (India)', code: 'en-IN', locale: 'en' },
  { name: 'English (Kenya)', code: 'en-KE', locale: 'en' },
  { name: 'English (Nigeria)', code: 'en-NG', locale: 'en' },
  { name: 'English (New Zealand)', code: 'en-NZ', locale: 'en' },
  { name: 'English (Philippines)', code: 'en-PH', locale: 'en' },
  { name: 'English (Singapore)', code: 'en-SG', locale: 'en' },
  { name: 'English (Tanzania)	', code: 'en-TZ', locale: 'en' },
  { name: 'English (South Africa)', code: 'en-ZA', locale: 'en' },
  { name: 'Estonian', code: 'et-EE', locale: 'et' },
  { name: 'Finnish', code: 'fi-FI', locale: 'fi' },
  { name: 'Filipino', code: 'fil-PH', locale: 'fil' },
  { name: 'French (France)', code: 'fr-FR', locale: 'fr' },
  { name: 'French (Belgium)', code: 'fr-BE', locale: 'fr' },
  { name: 'French (Canada)', code: 'fr-CA', locale: 'fr' },
  { name: 'French (Switzerland)', code: 'fr-CH', locale: 'fr' },
  { name: 'Galician', code: 'gl-ES', locale: 'gl' },
  { name: 'Greek', code: 'el-GR', locale: 'el' },
  { name: 'German (Germany)', code: 'de-DE', locale: 'de' },
  { name: 'German (Switzerland)', code: 'de-CH', locale: 'de' },
  { name: 'German (Austria)', code: 'de-AT', locale: 'de' },
  { name: 'Georgian', code: 'ka-GE', locale: 'ka' },
  { name: 'Hebrew', code: 'he-IL', locale: 'he' },
  { name: 'Hindi (India)', code: 'hi-IN', locale: 'hi' },
  { name: 'Gujarati (India)', code: 'gu-IN', locale: 'gu' },
  { name: 'Kannada (India)', code: 'kn-IN', locale: 'kn' },
  { name: 'Malayalam (India)', code: 'ml-IN', locale: 'ml' },
  { name: 'Marathi (India)', code: 'mr-IN', locale: 'mr' },
  { name: 'Tamil (India)', code: 'ta-IN', locale: 'ta' },
  { name: 'Telugu (India)', code: 'te-IN', locale: 'te' },
  { name: 'Irish', code: 'ga-IE', locale: 'ga' },
  { name: 'Italian (Italy)', code: 'it-IT', locale: 'it' },
  { name: 'Italian (Switzerland)', code: 'it-CH', locale: 'it' },
  { name: 'Indonesian', code: 'id-ID', locale: 'id' },
  { name: 'Icelandic', code: 'is-IS', locale: 'is' },
  { name: 'Japanese', code: 'ja-JP', locale: 'ja' },
  { name: 'Javanese', code: 'jv-ID', locale: 'jv' },
  { name: 'Kazakh', code: 'kk-KZ', locale: 'kk' },
  { name: 'Khmer', code: 'km-KH', locale: 'km' },
  { name: 'Korean', code: 'ko-KR', locale: 'ko' },
  { name: 'Lao', code: 'lo-LA', locale: 'lo' },
  { name: 'Lithuanian', code: 'lt-LT', locale: 'lt' },
  { name: 'Latvian', code: 'lv-LV', locale: 'lv' },
  { name: 'Macedonian', code: 'mk-MK', locale: 'mk' },
  { name: 'Mongolian', code: 'mn-MN', locale: 'mn' },
  { name: 'Malay', code: 'ms-MY', locale: 'ms' },
  { name: 'Maltese', code: 'mt-MT', locale: 'mt' },
  { name: 'Norwegian Bokmål', code: 'nb-NO', locale: 'nb' },
  { name: 'Nepali', code: 'ne-NP', locale: 'ne' },
  { name: 'Polish', code: 'pl-PL', locale: 'pl' },
  { name: 'Pashto', code: 'ps-AF', locale: 'ps' },
  { name: 'Persian', code: 'fa-IR', locale: 'fa' },
  { name: 'Portuguese (Brazil)', code: 'pt-BR', locale: 'pt' },
  { name: 'Portuguese (Portugal)', code: 'pt-PT', locale: 'pt' },
  { name: 'Romanian', code: 'ro-RO', locale: 'ro' },
  { name: 'Russian', code: 'ru-RU', locale: 'ru' },
  { name: 'Sinhala', code: 'si-LK', locale: 'si' },
  { name: 'Spanish (Spain)', code: 'es-ES', locale: 'es' },
  { name: 'Spanish (Mexico)', code: 'es-MX', locale: 'es' },
  { name: 'Spanish (Argentina)', code: 'es-AR', locale: 'es' },
  { name: 'Spanish (Bolivia)', code: 'es-BO', locale: 'es' },
  { name: 'Spanish (Chile)', code: 'es-CL', locale: 'es' },
  { name: 'Spanish (Colombia)', code: 'es-CO', locale: 'es' },
  { name: 'Spanish (Costa Rica)', code: 'es-CR', locale: 'es' },
  { name: 'Spanish (Cuba)', code: 'es-CU', locale: 'es' },
  { name: 'Spanish (Dominican Republic)', code: 'es-DO', locale: 'es' },
  { name: 'Spanish (Ecuador)', code: 'es-EC', locale: 'es' },
  { name: 'Spanish (Equatorial Guinea)', code: 'es-GQ', locale: 'es' },
  { name: 'Spanish (Guatemala)', code: 'es-GT', locale: 'es' },
  { name: 'Spanish (Honduras)', code: 'es-HN', locale: 'es' },
  { name: 'Spanish (Nicaragua)', code: 'es-NI', locale: 'es' },
  { name: 'Spanish (Panama)', code: 'es-PA', locale: 'es' },
  { name: 'Spanish (Peru)', code: 'es-PE', locale: 'es' },
  { name: 'Spanish (Puerto Rico)', code: 'es-PR', locale: 'es' },
  { name: 'Spanish (Paraguay)', code: 'es-PY', locale: 'es' },
  { name: 'Spanish (El Salvador)', code: 'es-SV', locale: 'es' },
  { name: 'Spanish (United States)', code: 'es-US', locale: 'es' },
  { name: 'Spanish (Uruguay)', code: 'es-UY', locale: 'es' },
  { name: 'Spanish (Venezuela)', code: 'es-VE', locale: 'es' },
  { name: 'Slovak', code: 'sk-SK', locale: 'sk' },
  { name: 'Slovenian', code: 'sl-SI', locale: 'sl' },
  { name: 'Somali', code: 'so-SO', locale: 'so' },
  { name: 'Serbian', code: 'sr-RS', locale: 'sr-Cyrl' },
  { name: 'Swedish', code: 'sv-SE', locale: 'sv' },
  { name: 'Swahili (Kenya)', code: 'sw-KE', locale: 'sw' },
  { name: 'Swahili (Tanzania)', code: 'sw-TZ', locale: 'sw' },
  { name: 'Thai', code: 'th-TH', locale: 'th' },
  { name: 'Turkish', code: 'tr-TR', locale: 'tr' },
  { name: 'Ukrainian', code: 'uk-UA', locale: 'uk' },
  { name: 'Uzbek', code: 'uz-UZ', locale: 'uz' },
  { name: 'Vietnamese', code: 'vi-VN', locale: 'vi' },
  { name: 'Welsh', code: 'cy-GB', locale: 'cy' },
  { name: 'Zulu', code: 'zu-ZA', locale: 'zu' },
];

const supportedTranslationLangs = [
  { name: 'Afrikaans', code: 'af' },
  { name: 'Albanian', code: 'sq' },
  { name: 'Amharic', code: 'am' },
  { name: 'Arabic', code: 'ar' },
  { name: 'Armenian', code: 'hy' },
  { name: 'Assamese', code: 'as' },
  { name: 'Azerbaijani', code: 'az' },
  { name: 'Bangla', code: 'bn' },
  { name: 'Bosnian', code: 'bs' },
  { name: 'Bulgarian', code: 'bg' },
  { name: 'Cantonese', code: 'yue' },
  { name: 'Catalan', code: 'ca' },
  { name: 'Chinese Simplified', code: 'zh-Hans' },
  { name: 'Chinese Traditional', code: 'zh-Hant' },
  { name: 'Croatian', code: 'hr' },
  { name: 'Czech', code: 'cs' },
  { name: 'Danish', code: 'da' },
  { name: 'Dari', code: 'prs' },
  { name: 'Dutch', code: 'nl' },
  { name: 'English', code: 'en' },
  { name: 'Estonian', code: 'et' },
  { name: 'Fijian', code: 'fj' },
  { name: 'Filipino', code: 'fil' },
  { name: 'Finnish', code: 'fi' },
  { name: 'French', code: 'fr' },
  { name: 'German', code: 'de' },
  { name: 'Greek', code: 'el' },
  { name: 'Gujarati', code: 'gu' },
  { name: 'Haitian Creole', code: 'ht' },
  { name: 'Hebrew', code: 'he' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Hmong Daw', code: 'mww' },
  { name: 'Hungarian', code: 'hu' },
  { name: 'Icelandic', code: 'is' },
  { name: 'Indonesian', code: 'id' },
  { name: 'Inuktitut', code: 'iu' },
  { name: 'Irish', code: 'ga' },
  { name: 'Italian', code: 'it' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Kannada', code: 'kn' },
  { name: 'Kazakh', code: 'kk' },
  { name: 'Khmer', code: 'km' },
  { name: 'Klingon', code: 'tlh-Latn' },
  { name: 'Korean', code: 'ko' },
  { name: 'Kurdish', code: 'ku' },
  { name: 'Lao', code: 'lo' },
  { name: 'Latvian', code: 'lv' },
  { name: 'Lithuanian', code: 'lt' },
  { name: 'Malagasy', code: 'mg' },
  { name: 'Malay', code: 'ms' },
  { name: 'Malayalam', code: 'ml' },
  { name: 'Maltese', code: 'mt' },
  { name: 'Maori', code: 'mi' },
  { name: 'Marathi', code: 'mr' },
  { name: 'Myanmar', code: 'my' },
  { name: 'Nepali', code: 'ne' },
  { name: 'Norwegian', code: 'nb' },
  { name: 'Odia', code: 'or' },
  { name: 'Pashto', code: 'ps' },
  { name: 'Persian', code: 'fa' },
  { name: 'Polish', code: 'pl' },
  { name: 'Portuguese', code: 'pt' },
  { name: 'Punjabi', code: 'pa' },
  { name: 'Queretaro Otomi', code: 'otq' },
  { name: 'Romanian', code: 'ro' },
  { name: 'Russian', code: 'ru' },
  { name: 'Samoan', code: 'sm' },
  { name: 'Serbian', code: 'sr-Cyrl' },
  { name: 'Slovak', code: 'sk' },
  { name: 'Slovenian', code: 'sl' },
  { name: 'Spanish', code: 'es' },
  { name: 'Swahili', code: 'sw' },
  { name: 'Swedish', code: 'sv' },
  { name: 'Tahitian', code: 'ty' },
  { name: 'Tamil', code: 'ta' },
  { name: 'Telugu', code: 'te' },
  { name: 'Thai', code: 'th' },
  { name: 'Tigrinya', code: 'ti' },
  { name: 'Tongan', code: 'to' },
  { name: 'Turkish', code: 'tr' },
  { name: 'Ukrainian', code: 'uk' },
  { name: 'Urdu', code: 'ur' },
  { name: 'Vietnamese', code: 'vi' },
  { name: 'Welsh', code: 'cy' },
  { name: 'Yucatec Maya	', code: 'yua' },
];

const getSubtitleLangs = (
  speechLangs?: string[],
  transLangs?: string[],
): Array<SupportedLangs> => {
  if (!speechLangs || !transLangs) {
    const speechService =
      store.getState().session.currentRoom.metadata?.room_features
        .speech_to_text_translation_features;
    if (!speechLangs) {
      speechLangs = speechService?.allowed_speech_langs;
    }
    if (!transLangs) {
      transLangs = speechService?.allowed_trans_langs;
    }
  }

  const langs: Array<SupportedLangs> = [
    {
      name: i18n.t('speech-services.select-one-lang'),
      code: '',
    },
  ];

  if (speechLangs) {
    for (let i = 0; i < speechLangs.length; i++) {
      const l = speechLangs[i];
      const r = supportedSpeechToTextLangs.filter((lang) => lang.code === l);
      if (!r.length) {
        continue;
      }
      const find = langs.find((ll) => ll.code === r[0].locale);
      if (!find) {
        const obj = supportedTranslationLangs.filter(
          (lang) => lang.code === r[0].locale,
        );
        langs.push(...obj);
      }
    }
  }
  if (transLangs) {
    for (let i = 0; i < transLangs.length; i++) {
      const l = transLangs[i];
      const r = supportedTranslationLangs.filter((lang) => lang.code === l);
      if (!r.length) {
        continue;
      }
      const find = langs.find((ll) => ll.code === r[0].code);
      if (!find) {
        langs.push(...r);
      }
    }
  }

  return langs;
};

export {
  supportedSpeechToTextLangs,
  supportedTranslationLangs,
  getSubtitleLangs,
};
