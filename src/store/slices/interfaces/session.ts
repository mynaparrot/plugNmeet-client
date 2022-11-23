export enum UserDeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
}

export interface ISession {
  token: string;
  serverVersion?: string;
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
  userDeviceType: UserDeviceType;
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
  wait_for_approval: boolean;
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
  is_breakout_room: boolean;
  started_at: number;
  logout_url?: string;
  room_features: IRoomFeatures;
  default_lock_settings?: ILockSettings;
  copyright_conf: ICopyright_conf;
}

interface IRoomFeatures {
  allow_webcams: boolean;
  mute_on_start: boolean;
  allow_screen_share: boolean;
  allow_rtmp: boolean;
  allow_view_other_webcams: boolean;
  allow_view_other_users_list: boolean;
  admin_only_webcams: boolean;
  allow_polls: boolean;
  room_duration: number;
  recording_features: IRecordingFeatures;
  chat_features: IChatFeatures;
  shared_note_pad_features: ISharedNotepadFeatures;
  whiteboard_features: IWhiteboardFeatures;
  external_media_player_features: IExternalMediaPlayerFeatures;
  waiting_room_features: IWaitingRoomFeatures;
  breakout_room_features: IBreakoutRoomFeatures;
  display_external_link_features: IDisplayExternalLinkFeatures;
}

export interface IRecordingFeatures {
  is_allow: boolean;
  is_allow_cloud: boolean;
  enable_auto_cloud_recording: boolean;
  is_allow_local: boolean;
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
  lock_private_chat: boolean;
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

export interface IWaitingRoomFeatures {
  is_active: boolean;
  waiting_room_msg: string;
}

export interface IBreakoutRoomFeatures {
  is_allow: boolean;
  is_active: boolean;
  allowed_number_rooms: number;
}

export interface IDisplayExternalLinkFeatures {
  is_allow: boolean;
  is_active: boolean;
  link?: string;
  shared_by?: string;
}

export interface ICopyright_conf {
  display: boolean;
  text: string;
}
