export interface IActiveSpeaker {
  userId: string;
  name: string;
  isSpeaking: boolean;
  audioLevel: number;
  lastSpokeAt: number;
}
