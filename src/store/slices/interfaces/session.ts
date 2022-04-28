export interface ISession {
  token: string;
  currentUser?: ICurrentUser;
  currentRoom: ICurrentRoom;
  screenSharing: IScreenSharing;
  isActiveRtmpBroadcasting: boolean;
  isActiveRecording: boolean;
  isWebcamPaginating: boolean;
  isStartup: boolean;
  isChatServiceReady: boolean;
  totalVideoSubscribers: number;
  totalAudioSubscribers: number;
  userDeviceType?: string;
}

export interface ICurrentUser {
  sid: string;
  userId: string;
  name?: string;
  isRecorder?: boolean;
  metadata?: ICurrentUserMetadata;
}

export interface ICurrentUserMetadata {
  profile_pic?: string;
  is_admin: boolean;
  is_presenter: boolean;
  raised_hand: boolean;
  lock_settings: ILockSettings;
}

export interface ICurrentRoom {
  sid: string;
  room_id: string;
  metadata?: IRoomMetadata;
}

export interface IRoomMetadata {
  room_title: string;
  welcome_message?: string;
  is_recording: boolean;
  is_active_rtmp: boolean;
  room_features: IRoomFeatures;
  default_lock_settings?: ILockSettings;
}

interface IRoomFeatures {
  allow_webcams: boolean;
  mute_on_start: boolean;
  allow_screen_share: boolean;
  allow_recording: boolean;
  allow_rtmp: boolean;
  allow_view_other_webcams: boolean;
  allow_view_other_users_list: boolean;
  admin_only_webcams: boolean;
  chat_features: IChatFeatures;
  shared_note_pad_features: ISharedNotepadFeatures;
  whiteboard_features: IWhiteboardFeatures;
  external_media_player_features: IExternalMediaPlayerFeatures;
}

interface IChatFeatures {
  allow_chat: boolean;
  allow_file_upload: boolean;
  allowed_file_types?: Array<string>;
  max_file_size?: number;
}

interface ISharedNotepadFeatures {
  allowed_shared_note_pad: boolean;
  is_active: boolean;
  visible: boolean;
  node_id?: string;
  host?: string;
  note_pad_id?: string;
  read_only_pad_id?: string;
}

interface IWhiteboardFeatures {
  allowed_whiteboard: boolean;
  visible: boolean;
  whiteboard_file_id: string;
  file_name: string;
  file_path: string;
  total_pages: number;
}

interface ILockSettings {
  lock_microphone: boolean;
  lock_webcam: boolean;
  lock_screen_sharing: boolean;
  lock_chat: boolean;
  lock_chat_send_message: boolean;
  lock_chat_file_share: boolean;
  lock_whiteboard: boolean;
  lock_shared_notepad: boolean;
}

export interface IScreenSharing {
  isActive: boolean;
  sharedBy: string;
}

export interface IRTMPBroadcasting {
  isActive: boolean;
  sharedBy: string;
}

export interface IExternalMediaPlayerFeatures {
  allowed_external_media_player: boolean;
  is_active: boolean;
  shared_by?: string;
  url?: string;
}
