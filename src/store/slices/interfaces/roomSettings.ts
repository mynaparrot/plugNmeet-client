import { VideoQuality } from 'livekit-client';
// @ts-expect-error no problem
import type { Theme } from '@excalidraw/excalidraw/types';

import { AzureTokenInfo } from '../../../components/speech-to-text-service/helpers/apiConnections';

export enum VideoObjectFit {
  COVER = 'cover',
  CONTAIN = 'contain',
}

export interface IRoomSettings {
  isShowRoomSettingsModal: boolean;
  isShowKeyboardShortcuts: boolean;
  isNatsServerConnected: boolean;

  audioDevices: Array<IMediaDevice>;
  videoDevices: Array<IMediaDevice>;
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  playAudioNotification: boolean;
  activateWebcamsView: boolean;
  activeScreenSharingView: boolean;
  allowPlayAudioNotification: boolean;
  roomAudioVolume: number;
  roomScreenShareAudioVolume: number;
  roomVideoQuality: VideoQuality;
  theme: Theme;
  videoObjectFit: VideoObjectFit;

  selectedTabLeftPanel: number;
  selectedChatOption: string;
  initiatePrivateChat: InitiatePrivateChat;
  unreadMsgFrom: Array<string>;

  columnCameraWidth: ColumnCameraWidth;
  columnCameraPosition: ColumnCameraPosition;
  visibleHeader: boolean;
  visibleFooter: boolean;
  azureTokenInfo?: AzureTokenInfo;
  isPNMWindowTabVisible: boolean;
  pinCamUserId?: string;
  focusActiveSpeakerWebcam: boolean;
  selfInsertedE2EESecretKey?: string;
}

export interface IMediaDevice {
  id: string;
  label: string;
}

export interface InitiatePrivateChat {
  name: string;
  userId: string;
}

export interface UnreadMsgFromPayload {
  task: 'ADD' | 'DEL';
  id: string;
}

export enum ColumnCameraWidth {
  FULL_WIDTH = 'full',
  MEDIUM_WIDTH = 'medium',
  SMALL_WIDTH = 'small',
}

export enum ColumnCameraPosition {
  LEFT = 'left',
  TOP = 'top',
  BOTTOM = 'bottom',
}
