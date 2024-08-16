import ConnectNats from './ConnectNats';
import { NatsSubjects } from '../proto/plugnmeet_common_api_pb';
import { Dispatch } from 'react';
import { IErrorPageProps } from '../../components/extra-pages/Error';
import { ConnectionStatus, IConnectLivekit } from '../livekit/types';

let conn: ConnectNats | undefined = undefined;

export const startNatsConn = async (
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
