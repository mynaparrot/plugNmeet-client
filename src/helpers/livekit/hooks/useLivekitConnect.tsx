import { useState } from 'react';
import { Room, LocalParticipant, RemoteParticipant } from 'livekit-client';

import { IErrorPageProps } from '../../../components/extra-pages/Error';
import ConnectLivekit, { IScreenShareInfo } from '../ConnectLivekit';

export interface IuseLivekitConnect {
  error: IErrorPageProps | undefined;
  setError: React.Dispatch<React.SetStateAction<IErrorPageProps | undefined>>;
  roomConnectionStatus: string;
  setRoomConnectionStatus: React.Dispatch<React.SetStateAction<string>>;
  currentRoom: Room | undefined;
  audioSubscribers: Map<string, RemoteParticipant> | undefined;
  videoSubscribers:
    | Map<string, RemoteParticipant | LocalParticipant>
    | undefined;
  screenShareInfo: Map<string, IScreenShareInfo> | undefined;
  startLivekitConnection(): void;
}

const useLivekitConnect = (): IuseLivekitConnect => {
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
  const [screenShareInfo, setScreenShareInfo] =
    useState<Map<string, IScreenShareInfo>>();

  const startLivekitConnection = () => {
    new ConnectLivekit(
      setAudioSubscribers,
      setVideoSubscribers,
      setCurrentRoom,
      setError,
      setRoomConnectionStatus,
      setScreenShareInfo,
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
    screenShareInfo: screenShareInfo,
    startLivekitConnection,
  };
};

export default useLivekitConnect;
