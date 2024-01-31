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
  isChatServiceReady: false,
  totalAudioSubscribers: 0,
  totalVideoSubscribers: 0,
  userDeviceType: UserDeviceType.DESKTOP,
  currentRoom: {
    sid: '',
    room_id: '',
    metadata: {
      room_title: 'plugNmeet',
      is_recording: false,
      is_active_rtmp: false,
      is_breakout_room: false,
      started_at: Date.now().toString(),
      room_features: {
        allow_webcams: true,
        mute_on_start: false,
        allow_screen_share: true,
        allow_rtmp: true,
        allow_view_other_webcams: true,
        allow_view_other_users_list: true,
        admin_only_webcams: false,
        allow_polls: true,
        room_duration: '0',
        recording_features: {
          is_allow: true,
          is_allow_cloud: true,
          enable_auto_cloud_recording: false,
          is_allow_local: true,
          only_record_admin_webcams: false,
        },
        chat_features: {
          allow_chat: true,
          allow_file_upload: true,
        },
        shared_note_pad_features: {
          allowed_shared_note_pad: false,
          is_active: false,
          visible: false,
        },
        whiteboard_features: {
          allowed_whiteboard: true,
          visible: false,
          whiteboard_file_id: 'default',
          file_name: 'default',
          file_path: 'default',
          total_pages: 10,
        },
        external_media_player_features: {
          allowed_external_media_player: true,
          is_active: false,
        },
        waiting_room_features: {
          is_active: false,
          waiting_room_msg: '',
        },
        breakout_room_features: {
          is_allow: true,
          is_active: false,
          allowed_number_rooms: 6,
        },
        display_external_link_features: {
          is_allow: true,
          is_active: false,
        },
        ingress_features: {
          is_allow: false,
        },
        speech_to_text_translation_features: {
          is_allow: false,
          is_allow_translation: false,
          is_enabled: false,
          is_enabled_translation: false,
          max_num_tran_langs_allow_selecting: 2,
        },
        end_to_end_encryption_features: {
          is_enabled: false,
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
        state.isActiveRtmpBroadcasting = action.payload.is_active_rtmp ?? false;
        state.isActiveRecording = action.payload.is_recording ?? false;
      }
    },
    updateIsChatServiceReady: (state, action: PayloadAction<boolean>) => {
      state.isChatServiceReady = action.payload;
    },
    updateTotalVideoSubscribers: (state, action: PayloadAction<number>) => {
      state.totalVideoSubscribers = action.payload;
    },
    updateTotalAudioSubscribers: (state, action: PayloadAction<number>) => {
      state.totalAudioSubscribers = action.payload;
    },
    updateMuteOnStart: (state, action: PayloadAction<boolean>) => {
      if (state.currentRoom.metadata) {
        state.currentRoom.metadata.room_features.mute_on_start = action.payload;
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
  updateIsChatServiceReady,
  updateTotalVideoSubscribers,
  updateTotalAudioSubscribers,
  updateMuteOnStart,
  updateUserDeviceType,
} = sessionSlice.actions;

export default sessionSlice.reducer;
