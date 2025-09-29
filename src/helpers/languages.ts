interface Language {
  code: string;
  text: string;
}

//prettier ignore
const languages: Language[] = [
  { code: 'ar-SA', text: 'اللغة العربية' },
  { code: 'bn-BD', text: 'বাংলা' },
  { code: 'cs-CZ', text: 'Czech' },
  { code: 'da-DK', text: 'Danish' },
  { code: 'de-DE', text: 'Deutsch' },
  { code: 'el-GR', text: 'Greek' },
  { code: 'en', text: 'English' },
  { code: 'es-ES', text: 'Español' },
  { code: 'et-EE', text: 'Estonian' },
  { code: 'fa-IR', text: 'فارسی' },
  { code: 'fr-FR', text: 'Français' },
  { code: 'he-IL', text: 'Hebrew' },
  { code: 'hr-HR', text: 'Croatian' },
  { code: 'hu-HU', text: 'Hungarian' },
  { code: 'id-ID', text: 'Indonesian' },
  { code: 'it-IT', text: 'Italiano' },
  { code: 'ja-JP', text: '日本語' },
  { code: 'ko-KR', text: '한국어' },
  { code: 'lv-LV', text: 'Latvian' },
  { code: 'nl-NL', text: 'Dutch' },
  { code: 'no-NO', text: 'Norwegian' },
  { code: 'pl-PL', text: 'Polish' },
  { code: 'pt-PT', text: 'Português' },
  { code: 'ro-RO', text: 'Romanian' },
  { code: 'ru-RU', text: 'Русский' },
  { code: 'sv-SE', text: 'Swedish' },
  { code: 'tr-TR', text: 'Türkçe' },
  { code: 'uk-UA', text: 'Українська' },
  { code: 'vi-VN', text: 'Vietnamese' },
  { code: 'zh-CN', text: '简体中文' },
  { code: 'zh-TW', text: '繁體中文' },
];

const languagesMap = new Map<string, Language>();
languages.forEach((lang) => {
  languagesMap.set(lang.code, lang);
});

export { languagesMap };
export default languages;
