import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { VideoQuality } from 'livekit-client';
import { Theme } from '@excalidraw/excalidraw/element/types';

import {
  ColumnCameraPosition,
  ColumnCameraWidth,
  DeviceSessionStorageKeys,
  IMaxNumDisplayWebcams,
  IMediaDegradation,
  IMediaDevice,
  IMicrophoneConfig,
  InitiatePrivateChat,
  IRoomSettings,
  UnreadMsgFromPayload,
  UserNotification,
  VideoObjectFit,
} from './interfaces/roomSettings';
import { AzureTokenInfo } from '../../components/translation-transcription/helpers/apiConnections';
import { DB_STORE_NAMES, idbStore } from '../../helpers/libs/idb';
import { BackgroundConfig } from '../../helpers/libs/TwilioTrackProcessor';

const getStoredPreset = (key: DeviceSessionStorageKeys) => {
  try {
    return sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};

const DEFAULT_MICROPHONE_CONFIG: IMicrophoneConfig = {
  audioPreset: '',
  noiseSuppression: false,
};

// Falls back to the defaults when the stored value is absent, malformed, or
// sessionStorage is unavailable.
const readStoredMicrophoneConfig = (): IMicrophoneConfig => {
  try {
    const raw = sessionStorage.getItem(DeviceSessionStorageKeys.MICROPHONE_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<IMicrophoneConfig> | null;
      return {
        audioPreset: typeof parsed?.audioPreset === 'string' ? parsed.audioPreset : '',
        noiseSuppression: parsed?.noiseSuppression === true,
      };
    }
  } catch {
    // Corrupt JSON or unavailable storage: fall through to the defaults.
  }

  return { ...DEFAULT_MICROPHONE_CONFIG };
};

const initialState: IRoomSettings = {
  isShowRoomSettingsModal: false,
  isShowKeyboardShortcuts: false,
  isNatsServerConnected: false,

  audioDevices: [],
  videoDevices: [],
  selectedAudioDevice: '',
  selectedVideoDevice: '',
  microphoneConfig: readStoredMicrophoneConfig(),
  selectedWebcamResolution: getStoredPreset(DeviceSessionStorageKeys.WEBCAM_RESOLUTION),
  selectedScreenShareResolution: getStoredPreset(DeviceSessionStorageKeys.SCREENSHARE_RESOLUTION),
  virtualBackground: { type: 'none' },

  playAudioNotification: false,
  activateWebcamsView: true,
  activeScreenSharingView: true,
  mediaDegradation: {
    incomingWebcamPaused: false,
    incomingScreensharePaused: false,
    outgoingCameraPaused: false,
    autoRestoreSuspended: false,
    videoQualityReduced: false,
  },
  allowPlayAudioNotification: true,
  roomAudioVolume: 1,
  roomScreenShareAudioVolume: 1,
  roomVideoQuality: VideoQuality.HIGH,
  theme: 'light',
  videoObjectFit: VideoObjectFit.CONTAIN,

  selectedTabLeftPanel: 0,
  selectedChatOption: 'public',
  initiatePrivateChat: {
    name: '',
    userId: '',
  },
  unreadMsgFrom: [],
  selectedChatTransLang: '',

  columnCameraWidth: ColumnCameraWidth.FULL_WIDTH,
  columnCameraPosition: ColumnCameraPosition.LEFT,
  visibleHeader: true,
  visibleFooter: true,
  isPNMWindowTabVisible: true,
  focusActiveSpeakerWebcam: true,
  userNotifications: [],
  isSidePanelOpened: false,
  hasWebcamPages: false,
  maxNumDisplayWebcams: {
    desktop: 24,
    tablet: 9,
    mobile: 6,
  },
};

const roomSettingsSlice = createSlice({
  name: 'room-settings',
  initialState,
  reducers: {
    updateShowRoomSettingsModal: (state, action: PayloadAction<boolean>) => {
      state.isShowRoomSettingsModal = action.payload;
    },
    updateShowKeyboardShortcutsModal: (state, action: PayloadAction<boolean>) => {
      state.isShowKeyboardShortcuts = action.payload;
    },
    updateIsNatsServerConnected: (state, action: PayloadAction<boolean>) => {
      state.isNatsServerConnected = action.payload;
    },
    addAudioDevices: (state, action: PayloadAction<Array<IMediaDevice>>) => {
      state.audioDevices = action.payload;
    },
    addVideoDevices: (state, action: PayloadAction<Array<IMediaDevice>>) => {
      state.videoDevices = action.payload;
    },
    updateSelectedAudioDevice: (state, action: PayloadAction<string>) => {
      state.selectedAudioDevice = action.payload;
      if (action.payload) {
        sessionStorage.setItem(DeviceSessionStorageKeys.AUDIO_DEVICE, action.payload);
      } else {
        sessionStorage.removeItem(DeviceSessionStorageKeys.AUDIO_DEVICE);
      }
    },
    updateSelectedVideoDevice: (state, action: PayloadAction<string>) => {
      state.selectedVideoDevice = action.payload;
      if (action.payload) {
        sessionStorage.setItem(DeviceSessionStorageKeys.VIDEO_DEVICE, action.payload);
      } else {
        sessionStorage.removeItem(DeviceSessionStorageKeys.VIDEO_DEVICE);
      }
    },
    updateMicrophoneConfig: (state, action: PayloadAction<Partial<IMicrophoneConfig>>) => {
      state.microphoneConfig = {
        ...state.microphoneConfig,
        ...action.payload,
      };

      const { audioPreset, noiseSuppression } = state.microphoneConfig;
      try {
        // Keep storage in sync with the in-memory config; an all-default value
        // is dropped so a fresh session starts clean.
        if (!audioPreset && !noiseSuppression) {
          sessionStorage.removeItem(DeviceSessionStorageKeys.MICROPHONE_CONFIG);
        } else {
          sessionStorage.setItem(
            DeviceSessionStorageKeys.MICROPHONE_CONFIG,
            JSON.stringify({ audioPreset, noiseSuppression }),
          );
        }
      } catch {
        // sessionStorage may be unavailable (private mode); keep in-memory only.
      }
    },
    updateSelectedWebcamResolution: (state, action: PayloadAction<string>) => {
      state.selectedWebcamResolution = action.payload;
      if (action.payload) {
        sessionStorage.setItem(DeviceSessionStorageKeys.WEBCAM_RESOLUTION, action.payload);
      } else {
        sessionStorage.removeItem(DeviceSessionStorageKeys.WEBCAM_RESOLUTION);
      }
    },
    updateSelectedScreenShareResolution: (state, action: PayloadAction<string>) => {
      state.selectedScreenShareResolution = action.payload;
      if (action.payload) {
        sessionStorage.setItem(DeviceSessionStorageKeys.SCREENSHARE_RESOLUTION, action.payload);
      } else {
        sessionStorage.removeItem(DeviceSessionStorageKeys.SCREENSHARE_RESOLUTION);
      }
    },
    updateVirtualBackground: (state, action: PayloadAction<BackgroundConfig>) => {
      state.virtualBackground = action.payload;
      if (action.payload.type === 'none') {
        sessionStorage.removeItem(DeviceSessionStorageKeys.VIRTUAL_BACKGROUND);
      } else {
        sessionStorage.setItem(
          DeviceSessionStorageKeys.VIRTUAL_BACKGROUND,
          JSON.stringify(action.payload),
        );
      }
    },
    updatePlayAudioNotification: (state, action: PayloadAction<boolean>) => {
      state.playAudioNotification = action.payload;
    },
    updateActivateWebcamsView: (state, action: PayloadAction<boolean>) => {
      state.activateWebcamsView = action.payload;
    },
    updateActiveScreenSharingView: (state, action: PayloadAction<boolean>) => {
      state.activeScreenSharingView = action.payload;
    },
    updateMediaDegradation: (state, action: PayloadAction<Partial<IMediaDegradation>>) => {
      state.mediaDegradation = {
        ...state.mediaDegradation,
        ...action.payload,
      };
    },
    updateAllowPlayAudioNotification: (state, action: PayloadAction<boolean>) => {
      state.allowPlayAudioNotification = action.payload;
    },
    updateRoomAudioVolume: (state, action: PayloadAction<number>) => {
      state.roomAudioVolume = action.payload;
    },
    updateRoomScreenShareAudioVolume: (state, action: PayloadAction<number>) => {
      state.roomScreenShareAudioVolume = action.payload;
    },
    updateRoomVideoQuality: (state, action: PayloadAction<VideoQuality>) => {
      state.roomVideoQuality = action.payload;
    },
    updateTheme: (state, action: PayloadAction<string>) => {
      state.theme = action.payload as Theme;
    },
    updateVideoObjectFit: (state, action: PayloadAction<VideoObjectFit>) => {
      state.videoObjectFit = action.payload;
    },
    updateSelectedTabLeftPanel: (state, action: PayloadAction<number>) => {
      state.selectedTabLeftPanel = action.payload;
    },
    updateSelectedChatOption: (state, action: PayloadAction<string>) => {
      state.selectedChatOption = action.payload;
    },
    updateInitiatePrivateChat: (state, action: PayloadAction<InitiatePrivateChat>) => {
      state.initiatePrivateChat = action.payload;
    },
    updateUnreadMsgFrom: (state, action: PayloadAction<UnreadMsgFromPayload>) => {
      const tmp = [...state.unreadMsgFrom];
      if (action.payload.task === 'ADD') {
        const exist = tmp.filter((id) => id === action.payload.id);
        if (!exist.length) {
          tmp.push(action.payload.id);
          state.unreadMsgFrom = tmp;
        }
      } else if (action.payload.task === 'DEL') {
        state.unreadMsgFrom = tmp.filter((id) => id !== action.payload.id);
      }
    },
    updateColumnCameraWidth: (state, action: PayloadAction<ColumnCameraWidth>) => {
      state.columnCameraWidth = action.payload;
    },
    updateColumnCameraPosition: (state, action: PayloadAction<ColumnCameraPosition>) => {
      state.columnCameraPosition = action.payload;
    },
    toggleHeaderVisibility: (state) => {
      state.visibleHeader = !state.visibleHeader;
    },
    toggleFooterVisibility: (state) => {
      state.visibleFooter = !state.visibleFooter;
    },
    updateAzureTokenInfo: (state, action: PayloadAction<AzureTokenInfo>) => {
      state.azureTokenInfo = action.payload;
    },
    cleanAzureToken: (state) => {
      if (state.azureTokenInfo) {
        state.azureTokenInfo.token = '';
      }
    },
    updateIsPNMWindowTabVisible: (state, action: PayloadAction<boolean>) => {
      state.isPNMWindowTabVisible = action.payload;
    },
    updatePinCamUserId: (state, action: PayloadAction<string | undefined>) => {
      state.pinCamUserId = action.payload;
    },
    updateFocusActiveSpeakerWebcam: (state, action: PayloadAction<boolean>) => {
      state.focusActiveSpeakerWebcam = action.payload;
    },
    addSelfInsertedE2EESecretKey: (state, action: PayloadAction<string>) => {
      state.selfInsertedE2EESecretKey = action.payload;
    },
    addUserNotification: (state, action: PayloadAction<UserNotification>) => {
      if (!action.payload.created) {
        action.payload.created = Date.now();
      }
      state.userNotifications.push(action.payload);
      if (action.payload.disablePersistentStorage) {
        return;
      }
      void idbStore(
        DB_STORE_NAMES.USER_NOTIFICATIONS,
        action.payload.created.toString(),
        action.payload,
      );
    },
    setAllUserNotifications: (state, action: PayloadAction<UserNotification[]>) => {
      state.userNotifications = action.payload;
    },
    updateIsSidePanelOpened: (state, action: PayloadAction<boolean>) => {
      state.isSidePanelOpened = action.payload;
    },
    updateSelectedChatTransLang: (state, action: PayloadAction<string>) => {
      state.selectedChatTransLang = action.payload;
    },
    updateHasWebcamPages: (state, action: PayloadAction<boolean>) => {
      state.hasWebcamPages = action.payload;
    },
    updateMaxNumDisplayWebcams: (state, action: PayloadAction<Partial<IMaxNumDisplayWebcams>>) => {
      state.maxNumDisplayWebcams = {
        ...state.maxNumDisplayWebcams,
        ...action.payload,
      };
    },
  },
});

export const {
  addAudioDevices,
  addVideoDevices,
  updateSelectedAudioDevice,
  updateSelectedVideoDevice,
  updateMicrophoneConfig,
  updateSelectedWebcamResolution,
  updateSelectedScreenShareResolution,
  updateVirtualBackground,
  updatePlayAudioNotification,
  updateShowRoomSettingsModal,
  updateActivateWebcamsView,
  updateActiveScreenSharingView,
  updateMediaDegradation,
  updateAllowPlayAudioNotification,
  updateShowKeyboardShortcutsModal,
  updateRoomAudioVolume,
  updateRoomScreenShareAudioVolume,
  updateRoomVideoQuality,
  updateTheme,
  updateVideoObjectFit,
  updateSelectedTabLeftPanel,
  updateSelectedChatOption,
  updateInitiatePrivateChat,
  updateUnreadMsgFrom,
  updateColumnCameraWidth,
  updateColumnCameraPosition,
  toggleHeaderVisibility,
  toggleFooterVisibility,
  updateAzureTokenInfo,
  cleanAzureToken,
  updateIsNatsServerConnected,
  updateIsPNMWindowTabVisible,
  updatePinCamUserId,
  updateFocusActiveSpeakerWebcam,
  addSelfInsertedE2EESecretKey,
  addUserNotification,
  setAllUserNotifications,
  updateIsSidePanelOpened,
  updateSelectedChatTransLang,
  updateHasWebcamPages,
  updateMaxNumDisplayWebcams,
} = roomSettingsSlice.actions;

export default roomSettingsSlice.reducer;
