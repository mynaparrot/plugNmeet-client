export interface SpeechServiceData {
  lang: string;
  type: 'interim' | 'final';
  text: string;
}
