import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { VideoQuality } from 'livekit-client';
import { Theme } from '@excalidraw/excalidraw/element/types';

import {
  ColumnCameraPosition,
  ColumnCameraWidth,
  IMediaDevice,
  InitiatePrivateChat,
  IRoomSettings,
  UnreadMsgFromPayload,
  UserNotification,
  VideoObjectFit,
} from './interfaces/roomSettings';
import { AzureTokenInfo } from '../../components/speech-to-text-service/helpers/apiConnections';

const initialState: IRoomSettings = {
  isShowRoomSettingsModal: false,
  isShowKeyboardShortcuts: false,
  isNatsServerConnected: false,

  audioDevices: [],
  videoDevices: [],
  selectedAudioDevice: '',
  selectedVideoDevice: '',
  playAudioNotification: false,
  activateWebcamsView: true,
  activeScreenSharingView: true,
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

  columnCameraWidth: ColumnCameraWidth.FULL_WIDTH,
  columnCameraPosition: ColumnCameraPosition.LEFT,
  visibleHeader: true,
  visibleFooter: true,
  isPNMWindowTabVisible: true,
  focusActiveSpeakerWebcam: true,
  userNotifications: [],
};

const roomSettingsSlice = createSlice({
  name: 'room-settings',
  initialState,
  reducers: {
    updateShowRoomSettingsModal: (state, action: PayloadAction<boolean>) => {
      state.isShowRoomSettingsModal = action.payload;
    },
    updateShowKeyboardShortcutsModal: (
      state,
      action: PayloadAction<boolean>,
    ) => {
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
    },
    updateSelectedVideoDevice: (state, action: PayloadAction<string>) => {
      state.selectedVideoDevice = action.payload;
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
    updateAllowPlayAudioNotification: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.allowPlayAudioNotification = action.payload;
    },
    updateRoomAudioVolume: (state, action: PayloadAction<number>) => {
      state.roomAudioVolume = action.payload;
    },
    updateRoomScreenShareAudioVolume: (
      state,
      action: PayloadAction<number>,
    ) => {
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
    updateInitiatePrivateChat: (
      state,
      action: PayloadAction<InitiatePrivateChat>,
    ) => {
      state.initiatePrivateChat = action.payload;
    },
    updateUnreadMsgFrom: (
      state,
      action: PayloadAction<UnreadMsgFromPayload>,
    ) => {
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
    updateColumnCameraWidth: (
      state,
      action: PayloadAction<ColumnCameraWidth>,
    ) => {
      state.columnCameraWidth = action.payload;
    },
    updateColumnCameraPosition: (
      state,
      action: PayloadAction<ColumnCameraPosition>,
    ) => {
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
    },
  },
});

export const {
  addAudioDevices,
  addVideoDevices,
  updateSelectedAudioDevice,
  updateSelectedVideoDevice,
  updatePlayAudioNotification,
  updateShowRoomSettingsModal,
  updateActivateWebcamsView,
  updateActiveScreenSharingView,
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
} = roomSettingsSlice.actions;

export default roomSettingsSlice.reducer;
