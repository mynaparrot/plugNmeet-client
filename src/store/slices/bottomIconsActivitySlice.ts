import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface IBottomIconsSlice {
  isActiveMicrophone: boolean;
  isActiveWebcam: boolean;
  isActiveChatPanel: boolean;
  isActiveParticipantsPanel: boolean;
  isActiveRaisehand: boolean;
  isActiveRecording: boolean;
  isActiveScreenshare: boolean;
  isActiveMenu: boolean;
  isActiveEndSession: boolean;

  isMicMuted: boolean;
  screenWidth: number;

  // modal related
  showMicrophoneModal: boolean;
  showVideoShareModal: boolean;
  showLockSettingsModal: boolean;
  showRtmpModal: boolean;

  // start action related
  startMicrophoneShare: boolean;
  startWebcamShare: boolean;
  startRecording: boolean;
}

const initialState: IBottomIconsSlice = {
  isActiveMicrophone: false,
  isActiveWebcam: false,
  isActiveChatPanel: true,
  isActiveParticipantsPanel: true,
  isActiveRaisehand: false,
  isActiveRecording: false,
  isActiveScreenshare: false,
  isActiveMenu: false,
  isActiveEndSession: false,

  isMicMuted: false,
  screenWidth: 1024,

  showMicrophoneModal: false,
  showVideoShareModal: false,
  showLockSettingsModal: false,
  showRtmpModal: false,

  startMicrophoneShare: false,
  startWebcamShare: false,
  startRecording: false,
};
const bottomIconsSlice = createSlice({
  name: 'bottomIconsActivity',
  initialState,
  reducers: {
    updateIsActiveMicrophone: (state, action: PayloadAction<boolean>) => {
      state.isActiveMicrophone = action.payload;
    },
    updateIsMicMuted: (state, action: PayloadAction<boolean>) => {
      state.isMicMuted = action.payload;
    },
    updateIsActiveWebcam: (state, action: PayloadAction<boolean>) => {
      state.isActiveWebcam = action.payload;
    },
    updateIsActiveChatPanel: (state, action: PayloadAction<boolean>) => {
      // we'll close ParticipantsPanel if screen size is small
      if (
        state.screenWidth < 1024 &&
        state.isActiveParticipantsPanel &&
        action.payload
      ) {
        state.isActiveParticipantsPanel = false;
      }
      state.isActiveChatPanel = action.payload;
    },
    updateIsActiveParticipantsPanel: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      // we'll close ChatPanel if screen size is small
      if (
        state.screenWidth < 1024 &&
        state.isActiveChatPanel &&
        action.payload
      ) {
        state.isActiveChatPanel = false;
      }
      state.isActiveParticipantsPanel = action.payload;
    },
    updateIsActiveRaisehand: (state, action: PayloadAction<boolean>) => {
      state.isActiveRaisehand = action.payload;
    },
    updateIsActiveRecording: (state, action: PayloadAction<boolean>) => {
      state.isActiveRecording = action.payload;
    },
    updateIsActiveScreenshare: (state, action: PayloadAction<boolean>) => {
      state.isActiveScreenshare = action.payload;
    },
    updateIsActiveMenu: (state, action: PayloadAction<boolean>) => {
      state.isActiveMenu = action.payload;
    },
    updateIsActiveEndSession: (state, action: PayloadAction<boolean>) => {
      state.isActiveEndSession = action.payload;
    },
    updateScreenWidth: (state, action: PayloadAction<number>) => {
      state.screenWidth = action.payload;
    },

    // modal related
    updateShowMicrophoneModal: (state, action: PayloadAction<boolean>) => {
      state.showMicrophoneModal = action.payload;
    },
    updateShowVideoShareModal: (state, action: PayloadAction<boolean>) => {
      state.showVideoShareModal = action.payload;
    },
    updateShowLockSettingsModal: (state, action: PayloadAction<boolean>) => {
      state.showLockSettingsModal = action.payload;
    },
    updateShowRtmpModal: (state, action: PayloadAction<boolean>) => {
      state.showRtmpModal = action.payload;
    },

    // start action related
    updateStartMicrophoneShare: (state, action: PayloadAction<boolean>) => {
      state.startMicrophoneShare = action.payload;
    },
    updateStartWebcamShare: (state, action: PayloadAction<boolean>) => {
      state.startWebcamShare = action.payload;
    },
    updateStartRecording: (state, action: PayloadAction<boolean>) => {
      state.startRecording = action.payload;
    },
  },
});

export const {
  updateIsActiveMicrophone,
  updateIsMicMuted,
  updateIsActiveWebcam,
  updateIsActiveChatPanel,
  updateIsActiveParticipantsPanel,
  updateIsActiveRaisehand,
  updateIsActiveRecording,
  updateIsActiveScreenshare,
  updateIsActiveMenu,
  updateIsActiveEndSession,
  updateShowMicrophoneModal,
  updateShowVideoShareModal,
  updateShowLockSettingsModal,
  updateShowRtmpModal,
  updateStartMicrophoneShare,
  updateStartWebcamShare,
  updateStartRecording,
  updateScreenWidth,
} = bottomIconsSlice.actions;

export default bottomIconsSlice.reducer;
