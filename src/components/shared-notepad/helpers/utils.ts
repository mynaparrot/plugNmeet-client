// prettier-ignore
import { en, de, fr, es, ar, fa, he,  hr,  is, it, ja, ko, nl, no, pl, pt, ru, sk, uk, vi, zh, zhTW } from '@blocknote/core/locales';

// prettier-ignore
const blockNoteLocales: Record<string, typeof en> = {
  en, de, fr, es, ar, fa, he,  hr,  is, it, ja, ko, nl, no, pl, pt, ru, sk, uk, vi, zh, 'zh-tw': zhTW,
};

export const getBlockNoteDictionary = (language: string): typeof en => {
  const lang = language.toLowerCase();

  if (lang === 'zh-tw' || lang === 'zh-hant' || lang === 'zh-hk') {
    return blockNoteLocales['zh-tw'] ?? en;
  }

  const base = lang.split('-')[0];
  return blockNoteLocales[base] ?? en;
};
// prettier-ignore
const USER_COLORS = ['#2563EB', '#DC2626', '#16A34A', '#9333EA', '#EA580C', '#0891B2', '#DB2777',
  '#65A30D', '#7C3AED', '#0D9488',  '#4F46E5', '#B91C1C', '#1D4ED8', '#15803D', '#A21CAF', '#CA8A04',
];

export const getUserColor = () => {
  let color = sessionStorage.getItem('shared-notepad-user-color');
  if (!color || !USER_COLORS.includes(color)) {
    color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    sessionStorage.setItem('shared-notepad-user-color', color);
  }
  return color;
};

export const getContrastTextColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) {
    return '#ffffff';
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#ffffff';
};
