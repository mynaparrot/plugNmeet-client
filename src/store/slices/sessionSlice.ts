import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RoomMetadataSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

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
  isCloud: false,
  currentRoom: {
    sid: '',
    roomId: '',
    metadata: create(RoomMetadataSchema, {
      roomTitle: 'plugNmeet',
      welcomeMessage: 'Welcome to plugNmeet!',
      isRecording: false,
      isActiveRtmp: false,
      parentRoomId: '',
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
        allowVirtualBg: true,
        allowRaiseHand: true,
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
          allowedFileTypes: ['jpg', 'png', 'zip'],
        },
        sharedNotePadFeatures: {
          allowedSharedNotePad: true,
        },
        whiteboardFeatures: {
          allowedWhiteboard: true,
          visible: false,
          whiteboardFileId: '',
          fileName: '',
          filePath: '',
          totalPages: 0,
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
        },
        displayExternalLinkFeatures: {
          isAllow: true,
        },
        ingressFeatures: {
          isAllow: true,
        },
        speechToTextTranslationFeatures: {
          isAllow: true,
          isAllowTranslation: true,
          isEnabled: false,
          isEnabledTranslation: false,
          allowedSpeechLangs: [],
          allowedSpeechUsers: [],
          allowedTransLangs: [],
          maxNumTranLangsAllowSelecting: 10,
        },
        endToEndEncryptionFeatures: {
          isEnabled: false,
          includedChatMessages: false,
          includedWhiteboard: false,
        },
      },
      copyrightConf: {
        display: true,
        text: 'Powered by <a href="https://www.plugnmeet.org" target="_blank">plugNmeet</a>',
      },
    }),
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
      state.currentRoom.roomId = action.payload.roomId;
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
      if (state.currentRoom.metadata?.roomFeatures) {
        state.currentRoom.metadata.roomFeatures.muteOnStart = action.payload;
      }
    },
    updateUserDeviceType: (state, action: PayloadAction<UserDeviceType>) => {
      state.userDeviceType = action.payload;
    },
    updateIsCloud: (state, action: PayloadAction<boolean>) => {
      state.isCloud = action.payload;
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
  updateIsCloud,
} = sessionSlice.actions;

export default sessionSlice.reducer;
