import type {
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  RemoteParticipant,
  RemoteTrackPublication,
  Room,
} from 'livekit-client';
import type EventEmitter from 'eventemitter3';
import { MediaServerConnInfo } from 'plugnmeet-protocol-js';
import { IParticipant } from '../../store/slices/interfaces/participant';

export enum CurrentConnectionEvents {
  ScreenShareStatus = 'screenShareStatus',
  VideoStatus = 'videoStatus',
  AudioSubscribers = 'audioSubscribers',
  VideoSubscribers = 'videoSubscribers',
  ScreenShareTracks = 'screenShareTracks',
}

export interface ISubscriberInfo {
  user: IParticipant;
  track: LocalTrackPublication | RemoteTrackPublication;
}

export interface IConnectLivekit extends EventEmitter {
  get room(): Room;
  get videoSubscribersMap(): Map<string, ISubscriberInfo>;
  get audioSubscribersMap(): Map<string, ISubscriberInfo>;
  get screenShareTracksMap(): Map<string, Array<ISubscriberInfo>>;
  initializeConnection(serverInfo: MediaServerConnInfo): Promise<void>;
  disconnectRoom(normalDisconnect: boolean): Promise<void>;
  setErrorStatus(title: string, reason: string): void;
  addAudioSubscriber(
    participant: Participant | LocalParticipant | RemoteParticipant,
    track: LocalTrackPublication | RemoteTrackPublication,
  ): void;
  removeAudioSubscriber(userId: string): void;
  addVideoSubscriber(
    participant: Participant | LocalParticipant | RemoteParticipant,
    track: LocalTrackPublication | RemoteTrackPublication,
  ): void;
  removeVideoSubscriber(userId: string): void;
  addScreenShareTrack(
    participant: Participant | LocalParticipant | RemoteParticipant,
    track: LocalTrackPublication | RemoteTrackPublication,
  ): void;
  removeScreenShareTrack(userId: string): void;
  on(
    event: CurrentConnectionEvents.ScreenShareStatus,
    listener: (active: boolean) => void,
  );
  on(
    event: CurrentConnectionEvents.VideoStatus,
    listener: (active: boolean) => void,
  );
  on(
    event: CurrentConnectionEvents.AudioSubscribers,
    listener: (subscribers: Map<string, ISubscriberInfo>) => void,
  );
  on(
    event: CurrentConnectionEvents.VideoSubscribers,
    listener: (subscribers: Map<string, ISubscriberInfo>) => void,
  );
  on(
    event: CurrentConnectionEvents.ScreenShareTracks,
    listener: (tracks: Map<string, Array<ISubscriberInfo>>) => void,
  );
}
