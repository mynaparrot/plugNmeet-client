import { VideoQuality } from 'livekit-client';
import { Theme } from '@excalidraw/excalidraw/element/types';
import type { TypeOptions } from 'react-toastify';

import { AzureTokenInfo } from '../../../components/translation-transcription/helpers/apiConnections';
import { BackgroundConfig } from '../../../helpers/libs/TwilioTrackProcessor';

export enum VideoObjectFit {
  COVER = 'cover',
  CONTAIN = 'contain',
}

export enum DeviceSessionStorageKeys {
  AUDIO_DEVICE = 'pnm-selected-audio-device',
  VIDEO_DEVICE = 'pnm-selected-video-device',
  VIRTUAL_BACKGROUND = 'pnm-selected-virtualbg',
  /** Grouped mic config (JSON). */
  MICROPHONE_CONFIG = 'pnm-microphone-config',
  WEBCAM_RESOLUTION = 'pnm-webcam-resolution',
  SCREENSHARE_RESOLUTION = 'pnm-screenshare-resolution',
}

export interface IRoomSettings {
  isShowRoomSettingsModal: boolean;
  isShowKeyboardShortcuts: boolean;
  isNatsServerConnected: boolean;

  audioDevices: Array<IMediaDevice>;
  videoDevices: Array<IMediaDevice>;
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  microphoneConfig: IMicrophoneConfig;
  selectedWebcamResolution: string;
  selectedScreenShareResolution: string;
  virtualBackground: BackgroundConfig;

  playAudioNotification: boolean;
  activateWebcamsView: boolean;
  activeScreenSharingView: boolean;
  mediaDegradation: IMediaDegradation;
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
  selectedChatTransLang: string;

  columnCameraWidth: ColumnCameraWidth;
  columnCameraPosition: ColumnCameraPosition;
  visibleHeader: boolean;
  visibleFooter: boolean;
  azureTokenInfo?: AzureTokenInfo;
  isPNMWindowTabVisible: boolean;
  pinCamUserId?: string;
  focusActiveSpeakerWebcam: boolean;
  selfInsertedE2EESecretKey?: string;
  userNotifications: UserNotification[];
  isSidePanelOpened: boolean;
  hasWebcamPages: boolean;
  maxNumDisplayWebcams: IMaxNumDisplayWebcams;
}

export interface IMicrophoneConfig {
  /** Selected audio quality preset key; empty string = use config default. */
  audioPreset: string;
  /** Opt-in GTCRN noise suppression (experimental, default off). */
  noiseSuppression: boolean;
}

export interface IMediaDegradation {
  incomingWebcamPaused: boolean;
  incomingScreensharePaused: boolean;
  outgoingCameraPaused: boolean;
  autoRestoreSuspended: boolean;
  /** true while the shared video quality is auto-lowered to reduce data usage */
  videoQualityReduced: boolean;
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

export interface UserNotification {
  message: string;
  typeOption: TypeOptions;
  notificationCat?: NotificationCats;
  data?: string;
  newInstance?: boolean;
  autoClose?: number | false;
  created?: number;
  disableToastNotification?: boolean;
  disablePersistentStorage?: boolean;
}

export type NotificationCats = 'new-poll-created' | 'breakout-room-invitation' | 'default';

export interface IMaxNumDisplayWebcams {
  desktop: number;
  tablet: number;
  mobile: number;
}
