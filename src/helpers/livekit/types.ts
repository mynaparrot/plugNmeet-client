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

export enum CurrentConnectionEvents {
  ScreenShareStatus = 'screenShareStatus',
  VideoStatus = 'videoStatus',
  AudioSubscribers = 'audioSubscribers',
  VideoSubscribers = 'videoSubscribers',
  ScreenShareTracks = 'screenShareTracks',
}

export interface LivekitInfo {
  livekit_host: string;
  token: string;
  enabledE2EE?: boolean;
  encryption_key?: string;
}

export interface IConnectLivekit extends EventEmitter {
  get room(): Room;
  get videoSubscribersMap(): Map<
    string,
    Participant | LocalParticipant | RemoteParticipant
  >;
  get audioSubscribersMap(): Map<string, RemoteParticipant>;
  get screenShareTracksMap(): Map<
    string,
    Array<LocalTrackPublication | RemoteTrackPublication>
  >;
  initializeConnection(serverInfo: MediaServerConnInfo): Promise<void>;
  disconnectRoom(normalDisconnect: boolean): Promise<void>;
  setErrorStatus(title: string, reason: string): void;
  addAudioSubscriber(
    participant: Participant | LocalParticipant | RemoteParticipant,
  ): void;
  removeAudioSubscriber(userId: string): void;
  addVideoSubscriber(
    participant: Participant | LocalParticipant | RemoteParticipant,
  ): void;
  removeVideoSubscriber(userId: string): void;
  addScreenShareTrack(
    userId: string,
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
    listener: (subscribers: Map<string, RemoteParticipant>) => void,
  );
  on(
    event: CurrentConnectionEvents.VideoSubscribers,
    listener: (
      subscribers: Map<string, LocalParticipant | RemoteParticipant>,
    ) => void,
  );
  on(
    event: CurrentConnectionEvents.ScreenShareTracks,
    listener: (
      tracks: Map<
        string,
        Array<LocalTrackPublication | RemoteTrackPublication>
      >,
    ) => void,
  );
}
