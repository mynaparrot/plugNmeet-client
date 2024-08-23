import ConnectNats from './ConnectNats';
import { Dispatch } from 'react';
import { IErrorPageProps } from '../../components/extra-pages/Error';
import { ConnectionStatus, IConnectLivekit } from '../livekit/types';
import { NatsSubjects } from '../proto/plugnmeet_nats_msg_pb';

let conn: ConnectNats | undefined = undefined;

export const startNatsConn = async (
  natsWSUrl: string,
  token: string,
  roomId: string,
  userId: string,
  subjects: NatsSubjects,
  errorState: Dispatch<IErrorPageProps>,
  roomConnectionStatusState: Dispatch<ConnectionStatus>,
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

  return conn;
};

export const getNatsConn = () => {
  return conn as ConnectNats;
};
