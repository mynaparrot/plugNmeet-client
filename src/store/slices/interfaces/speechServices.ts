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

export type SpeechSubtitleTypes = 'interim' | 'final';

export interface ISpeechSubtitleText {
  type: SpeechSubtitleTypes;
  result: TextWithInfo;
}

export type SpeechTextBroadcastFormat = {
  type: SpeechSubtitleTypes;
  from: string;
  result: { [k: string]: string };
};
