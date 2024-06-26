import { Dispatch, SetStateAction, useState } from 'react';

import { IErrorPageProps } from '../../../components/extra-pages/Error';
import { IConnectLivekit } from '../types';
import { createLivekitConnection } from '../utils';

export interface LivekitInfo {
  livekit_host: string;
  token: string;
  enabledE2EE: boolean;
}

export interface IUseLivekitConnect {
  error: IErrorPageProps | undefined;
  setError: Dispatch<SetStateAction<IErrorPageProps | undefined>>;
  roomConnectionStatus: string;
  setRoomConnectionStatus: Dispatch<SetStateAction<string>>;
  startLivekitConnection(info: LivekitInfo): IConnectLivekit;
}

const useLivekitConnect = (): IUseLivekitConnect => {
  const [error, setError] = useState<IErrorPageProps | undefined>();
  const [roomConnectionStatus, setRoomConnectionStatus] =
    useState<string>('loading');

  const startLivekitConnection = (info: LivekitInfo): IConnectLivekit => {
    return createLivekitConnection(info, setError, setRoomConnectionStatus);
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
