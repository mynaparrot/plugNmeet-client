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

  selectedTabLeftPanel: number;
  selectedChatTab: SelectedChatTab;
  initiatePrivateChat: InitiatePrivateChat;
  unreadPrivateMsgFrom: string;
}

export interface IMediaDevice {
  id: string;
  label: string;
}

export interface SelectedChatTab {
  index: number;
  userId: string;
}

export interface InitiatePrivateChat {
  name: string;
  userId: string;
}
