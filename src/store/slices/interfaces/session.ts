import { type RoomMetadata, UserMetadata } from 'plugnmeet-protocol-js';

export enum UserDeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
}

export interface ISession {
  token: string;
  serverVersion?: string;
  currentUser?: ICurrentUser;
  currentRoom: ICurrentRoom;
  screenSharing: IScreenSharing;
  isActiveRtmpBroadcasting: boolean;
  isActiveRecording: boolean;
  isWebcamPaginating: boolean;
  isStartup: boolean;
  totalVideoSubscribers: number;
  totalAudioSubscribers: number;
  userDeviceType: UserDeviceType;
  isCloud: boolean;
}

export interface ICurrentUser {
  sid: string;
  userId: string;
  name: string;
  isRecorder?: boolean;
  metadata?: ICurrentUserMetadata;
}

export type IRoomMetadata = RoomMetadata;
export type ICurrentUserMetadata = UserMetadata;

export interface ICurrentRoom {
  sid: string;
  roomId: string;
  metadata?: IRoomMetadata;
}

export interface IScreenSharing {
  isActive: boolean;
  sharedBy: string;
}
