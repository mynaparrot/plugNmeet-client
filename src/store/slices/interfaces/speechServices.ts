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

export interface SpeechTextBroadcastFormat {
  type: SpeechSubtitleTypes;
  result: Array<{ [k: string]: string }>;
}
