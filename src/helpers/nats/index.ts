import { Dispatch } from 'react';
import { NatsSubjects } from 'plugnmeet-protocol-js';

import ConnectNats from './ConnectNats';
import { IErrorPageProps } from '../../components/extra-pages/Error';
import { IConnectLivekit } from '../livekit/types';
import { roomConnectionStatus } from '../../components/app/helper';

let conn: ConnectNats | undefined = undefined;

export const startNatsConn = async (
  natsWSUrl: string[],
  token: string,
  roomId: string,
  userId: string,
  subjects: NatsSubjects,
  errorState: Dispatch<IErrorPageProps>,
  roomConnectionStatusState: Dispatch<roomConnectionStatus>,
  setCurrentMediaServerConn: Dispatch<IConnectLivekit>,
) => {
  if (typeof conn !== 'undefined') {
    return conn;
  }

  conn = new ConnectNats(
    natsWSUrl,
    token,
    roomId,
    userId,
    subjects,
    errorState,
    roomConnectionStatusState,
    setCurrentMediaServerConn,
  );
  await conn.openConn();
};

export const getNatsConn = () => {
  return conn as ConnectNats;
};
