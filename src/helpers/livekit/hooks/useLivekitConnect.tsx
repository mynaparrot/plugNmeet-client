import { useState } from 'react';

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
  startLivekitConnection(info: LivekitInfo): IConnectLivekit;
}

const useLivekitConnect = (): IUseLivekitConnect => {
  const [error, setError] = useState<IErrorPageProps | undefined>();
  const [roomConnectionStatus, setRoomConnectionStatus] =
    useState<string>('loading');

  const startLivekitConnection = (info: LivekitInfo): IConnectLivekit => {
    return new ConnectLivekit(info, setError, setRoomConnectionStatus);
  };

  return {
    error,
    setError,
    roomConnectionStatus,
    setRoomConnectionStatus,
    startLivekitConnection,
  };
};

export default useLivekitConnect;
