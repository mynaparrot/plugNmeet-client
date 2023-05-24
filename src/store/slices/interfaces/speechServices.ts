export interface LastFinalText {
  time: string;
  text: string;
  from: string;
}

export interface ISpeechServices {
  selectedSubtitleLang: string;
  interimText: string;
  finalText: string;
  lastFinalTexts: LastFinalText[];
}

export type SpeechSubtitleTypes = 'interim' | 'final';

export interface ISpeechSubtitleText {
  type: SpeechSubtitleTypes;
  result: LastFinalText;
}

export type SpeechTextBroadcastFormat = {
  type: SpeechSubtitleTypes;
  from: string;
  result: { [k: string]: string };
};
