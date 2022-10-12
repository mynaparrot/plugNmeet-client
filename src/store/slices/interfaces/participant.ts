import { ConnectionQuality } from 'livekit-client';
import { ICurrentUserMetadata } from './session';

export interface IParticipant {
  sid: string;
  userId: string;
  name: string;
  metadata: ICurrentUserMetadata;
  audioTracks: number;
  audioVolume?: number;
  videoTracks: number;
  screenShareTrack: number;
  isMuted: boolean;
  connectionQuality: ConnectionQuality;
  isLocal: boolean;
  joinedAt: number;
  visibility: string;
  pinWebcam?: boolean;
}
