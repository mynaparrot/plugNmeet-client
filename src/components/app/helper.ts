import type { NatsSubjects } from 'plugnmeet-protocol-js';

export type roomConnectionStatus =
  | 'loading'
  | 'connecting'
  | 'checking'
  | 'connected'
  | 'disconnected'
  | 're-connecting'
  | 'error'
  | 'receiving-data'
  | 'insert-e2ee-key'
  | 'ready'
  | 'media-server-conn-start'
  | 'media-server-conn-established';

export interface InfoToOpenConn {
  accessToken: string;
  serverVersion: string;
  natsWsUrls: string[];
  roomId: string;
  userId: string;
  natsSubjects: NatsSubjects;
}
