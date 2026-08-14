import {
  en,
  de,
  fr,
  es,
  ar,
  fa,
  he,
  hr,
  is,
  it,
  ja,
  ko,
  nl,
  no,
  pl,
  pt,
  ru,
  sk,
  uk,
  vi,
  zh,
  zhTW,
} from '@blocknote/core/locales';

const blockNoteLocales: Record<string, typeof en> = {
  en,
  de,
  fr,
  es,
  ar,
  fa,
  he,
  hr,
  is,
  it,
  ja,
  ko,
  nl,
  no,
  pl,
  pt,
  ru,
  sk,
  uk,
  vi,
  zh,
  'zh-tw': zhTW,
};

export const getBlockNoteDictionary = (language: string): typeof en => {
  const lang = language.toLowerCase();

  if (lang === 'zh-tw' || lang === 'zh-hant' || lang === 'zh-hk') {
    return blockNoteLocales['zh-tw'] ?? en;
  }

  const base = lang.split('-')[0];
  return blockNoteLocales[base] ?? en;
};

export const getUserColor = () => {
  let color = sessionStorage.getItem('shared-notepad-user-color');
  if (!color) {
    color = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0');
    sessionStorage.setItem('shared-notepad-user-color', color);
  }
  return `#${color}`;
};
