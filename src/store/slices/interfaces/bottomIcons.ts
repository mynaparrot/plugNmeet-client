import { BackgroundConfig } from '../../../components/virtual-background/helpers/backgroundHelper';

export type DeviceOrientation = 'landscape' | 'portrait';

export interface IBottomIconsSlice {
  isActiveMicrophone: boolean;
  isActiveWebcam: boolean;
  isActiveRaisehand: boolean;
  isActiveRecording: boolean;
  isActiveScreenshare: boolean;
  isActiveSharedNotePad: boolean;
  isActiveWhiteboard: boolean;

  isActiveChatPanel: boolean;
  isActiveParticipantsPanel: boolean;
  isActiveInsightsAiTextChatPanel: boolean;
  isActivePollsPanel: boolean;

  isMicMuted: boolean;
  screenWidth: number;
  screenHeight: number;
  deviceOrientation: DeviceOrientation;

  // modal related
  showMicrophoneModal: boolean;
  showVideoShareModal: boolean;
  showLockSettingsModal: boolean;
  showRtmpModal: boolean;
  showExternalMediaPlayerModal: boolean;
  showManageWaitingRoomModal: boolean;
  showManageBreakoutRoomModal: boolean;
  showDisplayExternalLinkModal: boolean;
  showSpeechSettingsModal: boolean;
  showSpeechSettingOptionsModal: boolean;
  showInsightsAISettingsModal: boolean;

  totalUnreadChatMsgs: number;
  virtualBackground: BackgroundConfig;
  isEnabledExtendedVerticalCamView: boolean;
}
