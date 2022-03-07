import { BackgroundConfig } from '../../../components/virtual-background/helpers/backgroundHelper';

export interface IBottomIconsSlice {
  isActiveMicrophone: boolean;
  isActiveWebcam: boolean;
  isActiveChatPanel: boolean;
  isActiveParticipantsPanel: boolean;
  isActiveRaisehand: boolean;
  isActiveRecording: boolean;
  isActiveScreenshare: boolean;

  isMicMuted: boolean;
  screenWidth: number;

  // modal related
  showMicrophoneModal: boolean;
  showVideoShareModal: boolean;
  showLockSettingsModal: boolean;
  showRtmpModal: boolean;

  totalUnreadChatMsgs: number;
  virtualBackground: BackgroundConfig;
}
