export type SpeechSubtitleTypes = 'interim' | 'final';
export const SELECTED_SUBTITLE_LANG_KEY = 'selectedSubtitleLang';

export interface TextWithInfo {
  id: string;
  time: string;
  from: string;
  text: string;
}

export interface ISpeechServices {
  selectedSubtitleLang: string;
  subtitleFontSize: number;
  interimText?: TextWithInfo;
  finalText?: TextWithInfo;
  lastFinalTexts: TextWithInfo[];
}

export interface ISpeechSubtitleText {
  type: SpeechSubtitleTypes;
  result: TextWithInfo;
}

export type SpeechTextBroadcastFormat = {
  type: SpeechSubtitleTypes;
  from: string;
  result: { [k: string]: string };
};
