export interface ISpeechServices {
  selectedSubtitleLang: string;
  interimText: string;
  finalText: string;
}

export type SpeechSubtitleTypes = 'interim' | 'final';

export interface SpeechServiceData {
  lang: string;
  type: SpeechSubtitleTypes;
  text: string;
}

export interface ISpeechSubtitleText {
  type: SpeechSubtitleTypes;
  text: string;
}

export type SpeechTextBroadcastFormat = {
  type: SpeechSubtitleTypes;
  result: { [k: string]: string };
};
