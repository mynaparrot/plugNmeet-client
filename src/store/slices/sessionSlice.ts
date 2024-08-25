import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ISession,
  ICurrentUser,
  ICurrentRoom,
  ICurrentUserMetadata,
  IRoomMetadata,
  IScreenSharing,
  UserDeviceType,
} from './interfaces/session';

const initialState: ISession = {
  token: '',
  screenSharing: {
    isActive: false,
    sharedBy: '',
  },
  isActiveRtmpBroadcasting: false,
  isActiveRecording: false,
  isWebcamPaginating: false,
  isStartup: true,
  totalAudioSubscribers: 0,
  totalVideoSubscribers: 0,
  userDeviceType: UserDeviceType.DESKTOP,
  currentRoom: {
    sid: '',
    room_id: '',
    metadata: {
      roomTitle: 'plugNmeet',
      isRecording: false,
      isActiveRtmp: false,
      isBreakoutRoom: false,
      startedAt: Date.now().toString(),
      roomFeatures: {
        allowWebcams: true,
        muteOnStart: false,
        allowScreenShare: true,
        allowRtmp: true,
        allowViewOtherWebcams: true,
        allowViewOtherUsersList: true,
        adminOnlyWebcams: false,
        allowPolls: true,
        roomDuration: '0',
        recordingFeatures: {
          isAllow: true,
          isAllowCloud: true,
          enableAutoCloudRecording: false,
          isAllowLocal: true,
          onlyRecordAdminWebcams: false,
        },
        chatFeatures: {
          allowChat: true,
          allowFileUpload: true,
        },
        sharedNotePadFeatures: {
          allowedSharedNotePad: false,
          isActive: false,
          visible: false,
        },
        whiteboardFeatures: {
          allowedWhiteboard: true,
          visible: false,
          whiteboardFileId: 'default',
          fileName: 'default',
          filePath: 'default',
          totalPages: 10,
        },
        externalMediaPlayerFeatures: {
          allowedExternalMediaPlayer: true,
          isActive: false,
        },
        waitingRoomFeatures: {
          isActive: false,
          waitingRoomMsg: '',
        },
        breakoutRoomFeatures: {
          isAllow: true,
          isActive: false,
          allowedNumberRooms: 6,
        },
        displayExternalLinkFeatures: {
          isAllow: true,
          isActive: false,
        },
        ingressFeatures: {
          isAllow: false,
        },
        speechToTextTranslationFeatures: {
          isAllow: false,
          isAllowTranslation: false,
          isEnabled: false,
          isEnabledTranslation: false,
          maxNumTranLangsAllowSelecting: 2,
        },
        endToEndEncryptionFeatures: {
          isEnabled: false,
          includedChatMessages: false,
          includedWhiteboard: false,
        },
      },
      copyright_conf: {
        display: true,
        text: 'Powered by <a href="https://www.plugnmeet.org" target="_blank">plugNmeet</a>',
      },
    },
  },
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    addToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    addServerVersion: (state, action: PayloadAction<string>) => {
      state.serverVersion = action.payload;
    },
    toggleStartup: (state, action: PayloadAction<boolean>) => {
      state.isStartup = action.payload;
    },
    addCurrentUser: (state, action: PayloadAction<ICurrentUser>) => {
      state.currentUser = action.payload;
    },
    addCurrentRoom: (state, action: PayloadAction<ICurrentRoom>) => {
      state.currentRoom.room_id = action.payload.room_id;
      state.currentRoom.sid = action.payload.sid;
      if (action.payload.metadata) {
        state.currentRoom.metadata = action.payload.metadata;
      }
    },
    updateScreenSharing: (state, action: PayloadAction<IScreenSharing>) => {
      state.screenSharing = action.payload;
    },
    setWebcamPaginating: (state, action: PayloadAction<boolean>) => {
      state.isWebcamPaginating = action.payload;
    },
    updateCurrentUserMetadata: (
      state,
      action: PayloadAction<ICurrentUserMetadata>,
    ) => {
      if (state.currentUser) {
        state.currentUser.metadata = action.payload;
      }
    },
    updateCurrentRoomMetadata: (
      state,
      action: PayloadAction<IRoomMetadata>,
    ) => {
      if (state.currentRoom) {
        state.currentRoom.metadata = action.payload;
        state.isActiveRtmpBroadcasting = action.payload.isActiveRtmp ?? false;
        state.isActiveRecording = action.payload.isRecording ?? false;
      }
    },
    updateTotalVideoSubscribers: (state, action: PayloadAction<number>) => {
      state.totalVideoSubscribers = action.payload;
    },
    updateTotalAudioSubscribers: (state, action: PayloadAction<number>) => {
      state.totalAudioSubscribers = action.payload;
    },
    updateMuteOnStart: (state, action: PayloadAction<boolean>) => {
      if (state.currentRoom.metadata) {
        state.currentRoom.metadata.roomFeatures.muteOnStart = action.payload;
      }
    },
    updateUserDeviceType: (state, action: PayloadAction<UserDeviceType>) => {
      state.userDeviceType = action.payload;
    },
  },
});

export const {
  addToken,
  addServerVersion,
  toggleStartup,
  addCurrentUser,
  addCurrentRoom,
  updateScreenSharing,
  setWebcamPaginating,
  updateCurrentUserMetadata,
  updateCurrentRoomMetadata,
  updateTotalVideoSubscribers,
  updateTotalAudioSubscribers,
  updateMuteOnStart,
  updateUserDeviceType,
} = sessionSlice.actions;

export default sessionSlice.reducer;
