export interface TextWithInfo {
  time: string;
  text: string;
  from: string;
}

export interface ISpeechServices {
  selectedSubtitleLang: string;
  interimText?: TextWithInfo;
  finalText: string;
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
