import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IMediaDevice {
  id: string;
  label: string;
}
interface IRoomSettings {
  isShowRoomSettingsModal: boolean;

  audioDevices: Array<IMediaDevice>;
  videoDevices: Array<IMediaDevice>;
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  playAudioNotification: boolean;
  activateWebcamsView: boolean;
  activeScreenSharingView: boolean;
  allowPlayAudioNotification: boolean;
}

const initialState: IRoomSettings = {
  isShowRoomSettingsModal: false,

  audioDevices: [],
  videoDevices: [],
  selectedAudioDevice: '',
  selectedVideoDevice: '',
  playAudioNotification: false,
  activateWebcamsView: true,
  activeScreenSharingView: true,
  allowPlayAudioNotification: true,
};

const roomSettingsSlice = createSlice({
  name: 'room-settings',
  initialState,
  reducers: {
    updateShowRoomSettingsModal: (state, action: PayloadAction<boolean>) => {
      state.isShowRoomSettingsModal = action.payload;
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
} = roomSettingsSlice.actions;

export default roomSettingsSlice.reducer;
