import {
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  RemoteParticipant,
  RemoteTrackPublication,
  Room,
} from 'livekit-client';
import { EventEmitter } from 'events';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 're-connecting'
  | 'error';

export enum CurrentConnectionEvents {
  ScreenShareStatus = 'screenShareStatus',
  VideoStatus = 'videoStatus',
  AudioSubscribers = 'audioSubscribers',
  VideoSubscribers = 'videoSubscribers',
  ScreenShareTracks = 'screenShareTracks',
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
    LocalTrackPublication | RemoteTrackPublication
  >;
  updateVideoSubscribers(
    participant: Participant | LocalParticipant | RemoteParticipant,
    add?: boolean,
  ): void;
  updateAudioSubscribers(
    participant: Participant | LocalParticipant | RemoteParticipant,
    add?: boolean,
  ): void;
  setScreenShareTrack(
    track: LocalTrackPublication | RemoteTrackPublication | undefined,
    participant: LocalParticipant | RemoteParticipant,
    add?: boolean,
  ): void;
  updateScreenShareOnUserDisconnect(participant: RemoteParticipant): void;
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
      tracks: Map<string, LocalTrackPublication | RemoteTrackPublication>,
    ) => void,
  );
}
