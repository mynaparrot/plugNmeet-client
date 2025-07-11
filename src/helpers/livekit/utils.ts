import { Dispatch } from 'react';

import { ConnectionStatus, IConnectLivekit, LivekitInfo } from './types';
import { IErrorPageProps } from '../../components/extra-pages/Error';
import ConnectLivekit from './ConnectLivekit';

let currentConnect: IConnectLivekit;

export const createLivekitConnection = (
  livekitInfo: LivekitInfo,
  errorState: Dispatch<IErrorPageProps>,
  roomConnectionStatusState: Dispatch<ConnectionStatus>,
  localUserId: string,
) => {
  currentConnect = new ConnectLivekit(
    livekitInfo,
    errorState,
    roomConnectionStatusState,
    localUserId,
  );

  return currentConnect;
};

export const getMediaServerConn = () => {
  if (typeof currentConnect === 'undefined') {
    throw new Error('connection not created');
  }
  return currentConnect;
};

export const getMediaServerConnRoom = () => {
  return getMediaServerConn().room;
};
