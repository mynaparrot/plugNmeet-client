import { useState } from 'react';
import {
  Room,
  LocalParticipant,
  RemoteParticipant,
  LocalTrackPublication,
  RemoteTrackPublication,
} from 'livekit-client';

import { IErrorPageProps } from '../../../components/extra-pages/Error';
import ConnectLivekit from '../ConnectLivekit';

export interface LivekitInfo {
  livekit_host: string;
  token: string;
}

export interface IUseLivekitConnect {
  error: IErrorPageProps | undefined;
  setError: React.Dispatch<React.SetStateAction<IErrorPageProps | undefined>>;
  roomConnectionStatus: string;
  setRoomConnectionStatus: React.Dispatch<React.SetStateAction<string>>;
  currentRoom: Room | undefined;
  audioSubscribers: Map<string, RemoteParticipant> | undefined;
  videoSubscribers:
    | Map<string, RemoteParticipant | LocalParticipant>
    | undefined;
  screenShareTracks:
    | Map<string, LocalTrackPublication | RemoteTrackPublication>
    | undefined;
  startLivekitConnection(info: LivekitInfo): void;
}

const useLivekitConnect = (): IUseLivekitConnect => {
  const [error, setError] = useState<IErrorPageProps | undefined>();
  const [currentRoom, setCurrentRoom] = useState<Room>();
  const [roomConnectionStatus, setRoomConnectionStatus] =
    useState<string>('loading');

  // audio subscribers
  const [audioSubscribers, setAudioSubscribers] =
    useState<Map<string, RemoteParticipant>>();
  // video/webcam subscribers
  const [videoSubscribers, setVideoSubscribers] =
    useState<Map<string, LocalParticipant | RemoteParticipant>>();
  // screen share
  const [screenShareTracks, setScreenShareTracks] =
    useState<Map<string, LocalTrackPublication | RemoteTrackPublication>>();

  const startLivekitConnection = (info: LivekitInfo) => {
    new ConnectLivekit(
      info,
      setAudioSubscribers,
      setVideoSubscribers,
      setCurrentRoom,
      setError,
      setRoomConnectionStatus,
      setScreenShareTracks,
    );
  };

  return {
    error,
    setError,
    roomConnectionStatus,
    setRoomConnectionStatus,
    currentRoom,
    audioSubscribers,
    videoSubscribers,
    screenShareTracks,
    startLivekitConnection,
  };
};

export default useLivekitConnect;
