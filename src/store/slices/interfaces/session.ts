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
  profilePic?: string;
  isAdmin: boolean;
  recordWebcam?: boolean;
  isPresenter: boolean;
  raisedHand: boolean;
  waitForApproval: boolean;
  preferredLang?: string;
  lockSettings: ILockSettings;
  metadataId?: string;
}

export interface ICurrentRoom {
  sid: string;
  room_id: string;
  metadata?: IRoomMetadata;
}

export interface IRoomMetadata {
  roomTitle: string;
  welcomeMessage?: string;
  isRecording: boolean;
  isActiveRtmp: boolean;
  isBreakoutRoom: boolean;
  startedAt: string;
  logoutUrl?: string;
  roomFeatures: IRoomFeatures;
  default_lock_settings?: ILockSettings;
  copyright_conf: ICopyright_conf;
  metadataId?: string;
}

interface IRoomFeatures {
  allowWebcams: boolean;
  muteOnStart: boolean;
  allowScreenShare: boolean;
  allowRtmp: boolean;
  allowViewOtherWebcams: boolean;
  allowViewOtherUsersList: boolean;
  adminOnlyWebcams: boolean;
  allowPolls: boolean;
  roomDuration: string;
  allowVirtualBg?: boolean;
  allowRaiseHand?: boolean;
  recordingFeatures: IRecordingFeatures;
  chatFeatures: IChatFeatures;
  sharedNotePadFeatures: ISharedNotepadFeatures;
  whiteboardFeatures: IWhiteboardFeatures;
  externalMediaPlayerFeatures: IExternalMediaPlayerFeatures;
  waitingRoomFeatures: IWaitingRoomFeatures;
  breakoutRoomFeatures: IBreakoutRoomFeatures;
  displayExternalLinkFeatures: IDisplayExternalLinkFeatures;
  ingressFeatures: IIngressFeatures;
  speechToTextTranslationFeatures: SpeechToTextTranslationFeatures;
  endToEndEncryptionFeatures: EndToEndEncryptionFeatures;
}

export interface IRecordingFeatures {
  isAllow: boolean;
  isAllowCloud: boolean;
  enableAutoCloudRecording: boolean;
  isAllowLocal: boolean;
  onlyRecordAdminWebcams: boolean;
}

interface IChatFeatures {
  allowChat: boolean;
  allowFileUpload: boolean;
  allowedFileTypes?: Array<string>;
  maxFileSize?: string;
}

interface ISharedNotepadFeatures {
  allowedSharedNotePad: boolean;
  isActive: boolean;
  visible: boolean;
  nodeId?: string;
  host?: string;
  notePadId?: string;
  readOnlyPadId?: string;
}

export interface IWhiteboardFeatures {
  allowedWhiteboard: boolean;
  visible: boolean;
  preloadFile?: string;
  whiteboardFileId: string;
  fileName: string;
  filePath: string;
  totalPages: number;
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
  allowedExternalMediaPlayer: boolean;
  isActive: boolean;
  sharedBy?: string;
  url?: string;
}

export interface IWaitingRoomFeatures {
  isActive: boolean;
  waitingRoomMsg: string;
}

export interface IBreakoutRoomFeatures {
  isAllow: boolean;
  isActive: boolean;
  allowedNumberRooms: number;
}

export interface IDisplayExternalLinkFeatures {
  isAllow: boolean;
  isActive: boolean;
  link?: string;
  sharedBy?: string;
}

export interface ICopyright_conf {
  display: boolean;
  text: string;
}

export interface IIngressFeatures {
  isAllow: boolean;
  inputType?: number;
  url?: string;
  streamKey?: string;
}

export interface SpeechToTextTranslationFeatures {
  isAllow: boolean;
  isAllowTranslation: boolean;
  isEnabled: boolean;
  isEnabledTranslation: boolean;
  maxNumTranLangsAllowSelecting: number;
  allowedSpeechLangs?: string[];
  allowedSpeechUsers?: string[];
  allowedTransLangs?: string[];
  defaultSubtitleLang?: string;
}

export interface EndToEndEncryptionFeatures {
  isEnabled: boolean;
  includedChatMessages: boolean;
  includedWhiteboard: boolean;
  encryptionKey?: string;
}
