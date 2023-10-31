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
  record_webcam?: boolean;
  is_presenter: boolean;
  raised_hand: boolean;
  wait_for_approval: boolean;
  lock_settings: ILockSettings;
  metadata_id?: string;
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
  started_at: string;
  logout_url?: string;
  room_features: IRoomFeatures;
  default_lock_settings?: ILockSettings;
  copyright_conf: ICopyright_conf;
  metadata_id?: string;
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
  room_duration: string;
  recording_features: IRecordingFeatures;
  chat_features: IChatFeatures;
  shared_note_pad_features: ISharedNotepadFeatures;
  whiteboard_features: IWhiteboardFeatures;
  external_media_player_features: IExternalMediaPlayerFeatures;
  waiting_room_features: IWaitingRoomFeatures;
  breakout_room_features: IBreakoutRoomFeatures;
  display_external_link_features: IDisplayExternalLinkFeatures;
  ingress_features: IIngressFeatures;
  speech_to_text_translation_features: SpeechToTextTranslationFeatures;
  end_to_end_encryption_features: EndToEndEncryptionFeatures;
}

export interface IRecordingFeatures {
  is_allow: boolean;
  is_allow_cloud: boolean;
  enable_auto_cloud_recording: boolean;
  is_allow_local: boolean;
  only_record_admin_webcams: boolean;
}

interface IChatFeatures {
  allow_chat: boolean;
  allow_file_upload: boolean;
  allowed_file_types?: Array<string>;
  max_file_size?: string;
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

export interface IWhiteboardFeatures {
  allowed_whiteboard: boolean;
  visible: boolean;
  preload_file?: string;
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

export interface IIngressFeatures {
  is_allow: boolean;
  input_type?: number;
  url?: string;
  stream_key?: string;
}

export interface SpeechToTextTranslationFeatures {
  is_allow: boolean;
  is_allow_translation: boolean;
  is_enabled: boolean;
  is_enabled_translation: boolean;
  allowed_speech_langs?: string[];
  allowed_speech_users?: string[];
  allowed_trans_langs?: string[];
  default_subtitle_lang?: string;
}

export interface EndToEndEncryptionFeatures {
  is_enabled: boolean;
  encryption_key?: string;
}
