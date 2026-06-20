interface Language {
  code: string;
  text: string;
}

// prettier-ignore
const languages: Language[] = [
  { code: 'en', text: 'English' },
  { code: 'es-ES', text: 'Español' },
  { code: 'de-DE', text: 'Deutsch' },
  { code: 'fr-FR', text: 'Français' },
  { code: 'it-IT', text: 'Italiano' },
  { code: 'pt-PT', text: 'Português' },
  { code: 'ar-SA', text: 'اللغة العربية' },
  { code: 'bn-BD', text: 'বাংলা' },
  { code: 'cs-CZ', text: 'Czech' },
  { code: 'da-DK', text: 'Danish' },
  { code: 'el-GR', text: 'Greek' },
  { code: 'et-EE', text: 'Estonian' },
  { code: 'fa-IR', text: 'فارسی' },
  { code: 'he-IL', text: 'Hebrew' },
  { code: 'hr-HR', text: 'Croatian' },
  { code: 'hu-HU', text: 'Hungarian' },
  { code: 'id-ID', text: 'Indonesian' },
  { code: 'ja-JP', text: '日本語' },
  { code: 'ko-KR', text: '한국어' },
  { code: 'lv-LV', text: 'Latvian' },
  { code: 'nl-NL', text: 'Dutch' },
  { code: 'no-NO', text: 'Norwegian' },
  { code: 'pl-PL', text: 'Polish' },
  { code: 'ro-RO', text: 'Romanian' },
  { code: 'ru-RU', text: 'Русский' },
  { code: 'sv-SE', text: 'Swedish' },
  { code: 'tr-TR', text: 'Türkçe' },
  { code: 'uk-UA', text: 'Українська' },
  { code: 'vi-VN', text: 'Vietnamese' },
  { code: 'zh-CN', text: '简体中文' },
  { code: 'zh-TW', text: '繁體中文' },
];

// languagesMap will provide maps of language. Here key is the language code's lowercase
const languagesMap = new Map<string, Language>(
  languages.map((lang) => [lang.code.toLowerCase(), lang]),
);

export { languagesMap };
export default languages;
