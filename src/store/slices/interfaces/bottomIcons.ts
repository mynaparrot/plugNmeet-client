export type DeviceOrientation = 'landscape' | 'portrait';

export type SidePanelType =
  'CHAT' | 'PARTICIPANTS' | 'POLLS' | 'BREAKOUT_ROOMS' | null;

export interface IBottomIconsSlice {
  isActiveMicrophone: boolean;
  isActiveWebcam: boolean;
  isActiveRaisehand: boolean;
  isActiveRecording: boolean;
  isActiveScreenshare: boolean;
  isActiveSharedNotePad: boolean;
  isActiveWhiteboard: boolean;
  isActiveInsightsAiTextChat: boolean;

  activeSidePanel: SidePanelType;

  isMicMuted: boolean;
  /** Hybrid: native cam mute while track stays published. Web unused (empty-stream mute). */
  isWebcamMuted: boolean;
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
  isEnabledExtendedVerticalCamView: boolean;
}
