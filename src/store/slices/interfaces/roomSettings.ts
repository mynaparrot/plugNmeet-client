import { VideoQuality } from 'livekit-client';

export interface IRoomSettings {
  isShowRoomSettingsModal: boolean;
  isShowKeyboardShortcuts: boolean;

  audioDevices: Array<IMediaDevice>;
  videoDevices: Array<IMediaDevice>;
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  playAudioNotification: boolean;
  activateWebcamsView: boolean;
  activeScreenSharingView: boolean;
  allowPlayAudioNotification: boolean;
  roomAudioVolume: number;
  roomVideoQuality: VideoQuality;
  enabledDarkMode: boolean;

  selectedTabLeftPanel: number;
  selectedChatOption: string;
  initiatePrivateChat: InitiatePrivateChat;
  unreadMsgFrom: Array<string>;
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
