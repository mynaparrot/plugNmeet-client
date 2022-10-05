import { useState } from 'react';
import { Room } from 'livekit-client';

import { IErrorPageProps } from '../../../components/extra-pages/Error';
import ConnectLivekit from '../ConnectLivekit';
import { IConnectLivekit } from '../types';

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
  startLivekitConnection(info: LivekitInfo): IConnectLivekit;
}

const useLivekitConnect = (): IUseLivekitConnect => {
  const [error, setError] = useState<IErrorPageProps | undefined>();
  const [currentRoom, setCurrentRoom] = useState<Room>();
  const [roomConnectionStatus, setRoomConnectionStatus] =
    useState<string>('loading');

  const startLivekitConnection = (info: LivekitInfo): IConnectLivekit => {
    return new ConnectLivekit(
      info,
      setCurrentRoom,
      setError,
      setRoomConnectionStatus,
    );
  };

  return {
    error,
    setError,
    roomConnectionStatus,
    setRoomConnectionStatus,
    currentRoom,
    startLivekitConnection,
  };
};

export default useLivekitConnect;
