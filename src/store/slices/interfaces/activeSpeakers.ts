export interface IActiveSpeaker {
  sid: string;
  userId: string;
  name: string;
  metadata?: string;
  isSpeaking: boolean;
  audioLevel: number;
  lastSpokeAt: number;
}
