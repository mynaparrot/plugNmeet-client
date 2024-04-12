import { Dispatch } from 'react';

import { ConnectionStatus, IConnectLivekit } from './types';
import { LivekitInfo } from './hooks/useLivekitConnect';
import { IErrorPageProps } from '../../components/extra-pages/Error';
import ConnectLivekit from './ConnectLivekit';

let currentConnect: IConnectLivekit;

export const createLivekitConnection = (
  livekitInfo: LivekitInfo,
  errorState: Dispatch<IErrorPageProps>,
  roomConnectionStatusState: Dispatch<ConnectionStatus>,
) => {
  currentConnect = new ConnectLivekit(
    livekitInfo,
    errorState,
    roomConnectionStatusState,
  );

  return currentConnect;
};

export const getCurrentConnection = () => {
  if (typeof currentConnect === undefined) {
    throw new Error('connection not created');
  }
  return currentConnect;
};

export const getCurrentRoom = () => {
  if (typeof currentConnect === undefined) {
    throw new Error('connection not created');
  }
  return currentConnect.room;
};

export const isCurrentUserRecorder = () => {
  const room = getCurrentRoom();

  return (
    room.localParticipant.identity === 'RECORDER_BOT' ||
    room.localParticipant.identity === 'RTMP_BOT'
  );
};
