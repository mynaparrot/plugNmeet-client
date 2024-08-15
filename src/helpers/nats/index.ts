import ConnectNats from './ConnectNats';
import { NatsSubjects } from '../proto/plugnmeet_common_api_pb';

let conn: ConnectNats | undefined = undefined;

export const startNatsConn = async (
  token: string,
  roomId: string,
  userId: string,
  subjects: NatsSubjects,
) => {
  if (typeof conn !== 'undefined') {
    return conn;
  }

  conn = new ConnectNats(token, roomId, userId, subjects);
  await conn.openConn();

  return conn;
};
