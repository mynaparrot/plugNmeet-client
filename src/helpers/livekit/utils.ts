import { Dispatch } from 'react';

import { IConnectLivekit } from './types';
import { IErrorPageProps } from '../../components/extra-pages/Error';
import ConnectLivekit from './ConnectLivekit';
import { roomConnectionStatus } from '../../components/app/helper';

let currentConnect: IConnectLivekit | undefined;

export const createLivekitConnection = (
  errorState: Dispatch<IErrorPageProps>,
  roomConnectionStatusState: Dispatch<roomConnectionStatus>,
  localUserId: string,
  enabledE2EE: boolean,
  encryptionKey?: string,
): IConnectLivekit => {
  if (currentConnect) {
    return currentConnect;
  }

  // If construction throws, currentConnect stays undefined so a retry is possible.
  currentConnect = new ConnectLivekit(
    errorState,
    roomConnectionStatusState,
    localUserId,
    enabledE2EE,
    encryptionKey,
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
