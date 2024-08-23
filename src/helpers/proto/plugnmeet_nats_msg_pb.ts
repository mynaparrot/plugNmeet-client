// @generated by protoc-gen-es v1.10.0 with parameter "target=ts,import_extension=.ts"
// @generated from file plugnmeet_nats_msg.proto (package plugnmeet, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import type {
  BinaryReadOptions,
  FieldList,
  JsonReadOptions,
  JsonValue,
  PartialMessage,
  PlainMessage,
} from '@bufbuild/protobuf';
import { Message, proto3, protoInt64 } from '@bufbuild/protobuf';
import { DataMsgBodyType } from './plugnmeet_datamessage_pb.ts';

/**
 * @generated from enum plugnmeet.NatsMsgServerToClientEvents
 */
export enum NatsMsgServerToClientEvents {
  /**
   * initial data
   *
   * @generated from enum value: INITIAL_DATA = 0;
   */
  INITIAL_DATA = 0,

  /**
   * @generated from enum value: JOINED_USERS_LIST = 1;
   */
  JOINED_USERS_LIST = 1,

  /**
   * @generated from enum value: ROOM_METADATA_UPDATE = 2;
   */
  ROOM_METADATA_UPDATE = 2,

  /**
   * @generated from enum value: USER_METADATA_UPDATE = 3;
   */
  USER_METADATA_UPDATE = 3,

  /**
   * @generated from enum value: USER_JOINED = 4;
   */
  USER_JOINED = 4,

  /**
   * @generated from enum value: USER_DISCONNECTED = 5;
   */
  USER_DISCONNECTED = 5,

  /**
   * @generated from enum value: USER_OFFLINE = 7;
   */
  USER_OFFLINE = 7,

  /**
   * @generated from enum value: RESP_RENEW_PNM_TOKEN = 8;
   */
  RESP_RENEW_PNM_TOKEN = 8,

  /**
   * @generated from enum value: SYSTEM_NOTIFICATION = 9;
   */
  SYSTEM_NOTIFICATION = 9,

  /**
   * @generated from enum value: RESP_DATA_MSG = 10;
   */
  RESP_DATA_MSG = 10,

  /**
   * @generated from enum value: AZURE_COGNITIVE_SERVICE_SPEECH_TOKEN = 11;
   */
  AZURE_COGNITIVE_SERVICE_SPEECH_TOKEN = 11,

  /**
   * @generated from enum value: SESSION_ENDED = 12;
   */
  SESSION_ENDED = 12,
}
// Retrieve enum metadata with: proto3.getEnumType(NatsMsgServerToClientEvents)
proto3.util.setEnumType(
  NatsMsgServerToClientEvents,
  'plugnmeet.NatsMsgServerToClientEvents',
  [
    { no: 0, name: 'INITIAL_DATA' },
    { no: 1, name: 'JOINED_USERS_LIST' },
    { no: 2, name: 'ROOM_METADATA_UPDATE' },
    { no: 3, name: 'USER_METADATA_UPDATE' },
    { no: 4, name: 'USER_JOINED' },
    { no: 5, name: 'USER_DISCONNECTED' },
    { no: 7, name: 'USER_OFFLINE' },
    { no: 8, name: 'RESP_RENEW_PNM_TOKEN' },
    { no: 9, name: 'SYSTEM_NOTIFICATION' },
    { no: 10, name: 'RESP_DATA_MSG' },
    { no: 11, name: 'AZURE_COGNITIVE_SERVICE_SPEECH_TOKEN' },
    { no: 12, name: 'SESSION_ENDED' },
  ],
);

/**
 * @generated from enum plugnmeet.NatsMsgClientToServerEvents
 */
export enum NatsMsgClientToServerEvents {
  /**
   * @generated from enum value: REQ_INITIAL_DATA = 0;
   */
  REQ_INITIAL_DATA = 0,

  /**
   * @generated from enum value: REQ_RENEW_PNM_TOKEN = 1;
   */
  REQ_RENEW_PNM_TOKEN = 1,

  /**
   * @generated from enum value: REQ_DATA_MSG = 2;
   */
  REQ_DATA_MSG = 2,

  /**
   * @generated from enum value: PING = 3;
   */
  PING = 3,

  /**
   * @generated from enum value: REQ_LOGOUT = 4;
   */
  REQ_LOGOUT = 4,

  /**
   * @generated from enum value: REQ_RAISE_HAND = 5;
   */
  REQ_RAISE_HAND = 5,

  /**
   * @generated from enum value: REQ_LOWER_HAND = 6;
   */
  REQ_LOWER_HAND = 6,

  /**
   * @generated from enum value: REQ_LOWER_OTHER_USER_HAND = 7;
   */
  REQ_LOWER_OTHER_USER_HAND = 7,

  /**
   * @generated from enum value: PUSH_ANALYTICS_DATA = 8;
   */
  PUSH_ANALYTICS_DATA = 8,
}
// Retrieve enum metadata with: proto3.getEnumType(NatsMsgClientToServerEvents)
proto3.util.setEnumType(
  NatsMsgClientToServerEvents,
  'plugnmeet.NatsMsgClientToServerEvents',
  [
    { no: 0, name: 'REQ_INITIAL_DATA' },
    { no: 1, name: 'REQ_RENEW_PNM_TOKEN' },
    { no: 2, name: 'REQ_DATA_MSG' },
    { no: 3, name: 'PING' },
    { no: 4, name: 'REQ_LOGOUT' },
    { no: 5, name: 'REQ_RAISE_HAND' },
    { no: 6, name: 'REQ_LOWER_HAND' },
    { no: 7, name: 'REQ_LOWER_OTHER_USER_HAND' },
    { no: 8, name: 'PUSH_ANALYTICS_DATA' },
  ],
);

/**
 * @generated from enum plugnmeet.NatsSystemNotificationTypes
 */
export enum NatsSystemNotificationTypes {
  /**
   * @generated from enum value: NATS_SYSTEM_NOTIFICATION_INFO = 0;
   */
  NATS_SYSTEM_NOTIFICATION_INFO = 0,

  /**
   * @generated from enum value: NATS_SYSTEM_NOTIFICATION_WARNING = 1;
   */
  NATS_SYSTEM_NOTIFICATION_WARNING = 1,

  /**
   * @generated from enum value: NATS_SYSTEM_NOTIFICATION_ERROR = 2;
   */
  NATS_SYSTEM_NOTIFICATION_ERROR = 2,
}
// Retrieve enum metadata with: proto3.getEnumType(NatsSystemNotificationTypes)
proto3.util.setEnumType(
  NatsSystemNotificationTypes,
  'plugnmeet.NatsSystemNotificationTypes',
  [
    { no: 0, name: 'NATS_SYSTEM_NOTIFICATION_INFO' },
    { no: 1, name: 'NATS_SYSTEM_NOTIFICATION_WARNING' },
    { no: 2, name: 'NATS_SYSTEM_NOTIFICATION_ERROR' },
  ],
);

/**
 * @generated from message plugnmeet.NatsSubjects
 */
export class NatsSubjects extends Message<NatsSubjects> {
  /**
   * @generated from field: string system_api_worker = 1;
   */
  systemApiWorker = '';

  /**
   * @generated from field: string system_js_worker = 2;
   */
  systemJsWorker = '';

  /**
   * @generated from field: string system_public = 3;
   */
  systemPublic = '';

  /**
   * @generated from field: string system_private = 4;
   */
  systemPrivate = '';

  /**
   * @generated from field: string chat = 5;
   */
  chat = '';

  /**
   * @generated from field: string whiteboard = 6;
   */
  whiteboard = '';

  /**
   * @generated from field: string data_channel = 7;
   */
  dataChannel = '';

  constructor(data?: PartialMessage<NatsSubjects>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = 'plugnmeet.NatsSubjects';
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: 'system_api_worker',
      kind: 'scalar',
      T: 9 /* ScalarType.STRING */,
    },
    {
      no: 2,
      name: 'system_js_worker',
      kind: 'scalar',
      T: 9 /* ScalarType.STRING */,
    },
    {
      no: 3,
      name: 'system_public',
      kind: 'scalar',
      T: 9 /* ScalarType.STRING */,
    },
    {
      no: 4,
      name: 'system_private',
      kind: 'scalar',
      T: 9 /* ScalarType.STRING */,
    },
    { no: 5, name: 'chat', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 6, name: 'whiteboard', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    {
      no: 7,
      name: 'data_channel',
      kind: 'scalar',
      T: 9 /* ScalarType.STRING */,
    },
  ]);

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): NatsSubjects {
    return new NatsSubjects().fromBinary(bytes, options);
  }

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): NatsSubjects {
    return new NatsSubjects().fromJson(jsonValue, options);
  }

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): NatsSubjects {
    return new NatsSubjects().fromJsonString(jsonString, options);
  }

  static equals(
    a: NatsSubjects | PlainMessage<NatsSubjects> | undefined,
    b: NatsSubjects | PlainMessage<NatsSubjects> | undefined,
  ): boolean {
    return proto3.util.equals(NatsSubjects, a, b);
  }
}

/**
 * @generated from message plugnmeet.NatsMsgServerToClient
 */
export class NatsMsgServerToClient extends Message<NatsMsgServerToClient> {
  /**
   * @generated from field: string id = 1;
   */
  id = '';

  /**
   * @generated from field: plugnmeet.NatsMsgServerToClientEvents event = 2;
   */
  event = NatsMsgServerToClientEvents.INITIAL_DATA;

  /**
   * @generated from field: string msg = 3;
   */
  msg = '';

  constructor(data?: PartialMessage<NatsMsgServerToClient>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = 'plugnmeet.NatsMsgServerToClient';
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: 'id', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    {
      no: 2,
      name: 'event',
      kind: 'enum',
      T: proto3.getEnumType(NatsMsgServerToClientEvents),
    },
    { no: 3, name: 'msg', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): NatsMsgServerToClient {
    return new NatsMsgServerToClient().fromBinary(bytes, options);
  }

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): NatsMsgServerToClient {
    return new NatsMsgServerToClient().fromJson(jsonValue, options);
  }

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): NatsMsgServerToClient {
    return new NatsMsgServerToClient().fromJsonString(jsonString, options);
  }

  static equals(
    a: NatsMsgServerToClient | PlainMessage<NatsMsgServerToClient> | undefined,
    b: NatsMsgServerToClient | PlainMessage<NatsMsgServerToClient> | undefined,
  ): boolean {
    return proto3.util.equals(NatsMsgServerToClient, a, b);
  }
}

/**
 * @generated from message plugnmeet.NatsMsgClientToServer
 */
export class NatsMsgClientToServer extends Message<NatsMsgClientToServer> {
  /**
   * @generated from field: string id = 1;
   */
  id = '';

  /**
   * @generated from field: plugnmeet.NatsMsgClientToServerEvents event = 2;
   */
  event = NatsMsgClientToServerEvents.REQ_INITIAL_DATA;

  /**
   * @generated from field: string msg = 3;
   */
  msg = '';

  constructor(data?: PartialMessage<NatsMsgClientToServer>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = 'plugnmeet.NatsMsgClientToServer';
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: 'id', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    {
      no: 2,
      name: 'event',
      kind: 'enum',
      T: proto3.getEnumType(NatsMsgClientToServerEvents),
    },
    { no: 3, name: 'msg', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): NatsMsgClientToServer {
    return new NatsMsgClientToServer().fromBinary(bytes, options);
  }

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): NatsMsgClientToServer {
    return new NatsMsgClientToServer().fromJson(jsonValue, options);
  }

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): NatsMsgClientToServer {
    return new NatsMsgClientToServer().fromJsonString(jsonString, options);
  }

  static equals(
    a: NatsMsgClientToServer | PlainMessage<NatsMsgClientToServer> | undefined,
    b: NatsMsgClientToServer | PlainMessage<NatsMsgClientToServer> | undefined,
  ): boolean {
    return proto3.util.equals(NatsMsgClientToServer, a, b);
  }
}

/**
 * @generated from message plugnmeet.NatsKvRoomInfo
 */
export class NatsKvRoomInfo extends Message<NatsKvRoomInfo> {
  /**
   * @generated from field: uint64 db_table_id = 1;
   */
  dbTableId = protoInt64.zero;

  /**
   * @generated from field: string room_id = 2;
   */
  roomId = '';

  /**
   * @generated from field: string room_sid = 3;
   */
  roomSid = '';

  /**
   * @generated from field: uint64 empty_timeout = 4;
   */
  emptyTimeout = protoInt64.zero;

  /**
   * @generated from field: bool enabled_e2ee = 5;
   */
  enabledE2ee = false;

  /**
   * @generated from field: string metadata = 6;
   */
  metadata = '';

  /**
   * @generated from field: uint64 created_at = 7;
   */
  createdAt = protoInt64.zero;

  constructor(data?: PartialMessage<NatsKvRoomInfo>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = 'plugnmeet.NatsKvRoomInfo';
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: 'db_table_id',
      kind: 'scalar',
      T: 4 /* ScalarType.UINT64 */,
    },
    { no: 2, name: 'room_id', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 3, name: 'room_sid', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    {
      no: 4,
      name: 'empty_timeout',
      kind: 'scalar',
      T: 4 /* ScalarType.UINT64 */,
    },
    { no: 5, name: 'enabled_e2ee', kind: 'scalar', T: 8 /* ScalarType.BOOL */ },
    { no: 6, name: 'metadata', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 7, name: 'created_at', kind: 'scalar', T: 4 /* ScalarType.UINT64 */ },
  ]);

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): NatsKvRoomInfo {
    return new NatsKvRoomInfo().fromBinary(bytes, options);
  }

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): NatsKvRoomInfo {
    return new NatsKvRoomInfo().fromJson(jsonValue, options);
  }

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): NatsKvRoomInfo {
    return new NatsKvRoomInfo().fromJsonString(jsonString, options);
  }

  static equals(
    a: NatsKvRoomInfo | PlainMessage<NatsKvRoomInfo> | undefined,
    b: NatsKvRoomInfo | PlainMessage<NatsKvRoomInfo> | undefined,
  ): boolean {
    return proto3.util.equals(NatsKvRoomInfo, a, b);
  }
}

/**
 * @generated from message plugnmeet.NatsKvUserInfo
 */
export class NatsKvUserInfo extends Message<NatsKvUserInfo> {
  /**
   * @generated from field: string user_id = 1;
   */
  userId = '';

  /**
   * @generated from field: string user_sid = 2;
   */
  userSid = '';

  /**
   * @generated from field: string name = 3;
   */
  name = '';

  /**
   * @generated from field: string room_id = 4;
   */
  roomId = '';

  /**
   * @generated from field: bool is_admin = 5;
   */
  isAdmin = false;

  /**
   * @generated from field: bool is_presenter = 6;
   */
  isPresenter = false;

  /**
   * @generated from field: string metadata = 7;
   */
  metadata = '';

  /**
   * @generated from field: uint64 joined_at = 8;
   */
  joinedAt = protoInt64.zero;

  /**
   * @generated from field: uint64 reconnected_at = 9;
   */
  reconnectedAt = protoInt64.zero;

  /**
   * @generated from field: uint64 disconnected_at = 10;
   */
  disconnectedAt = protoInt64.zero;

  constructor(data?: PartialMessage<NatsKvUserInfo>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = 'plugnmeet.NatsKvUserInfo';
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: 'user_id', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 2, name: 'user_sid', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 3, name: 'name', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 4, name: 'room_id', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 5, name: 'is_admin', kind: 'scalar', T: 8 /* ScalarType.BOOL */ },
    { no: 6, name: 'is_presenter', kind: 'scalar', T: 8 /* ScalarType.BOOL */ },
    { no: 7, name: 'metadata', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 8, name: 'joined_at', kind: 'scalar', T: 4 /* ScalarType.UINT64 */ },
    {
      no: 9,
      name: 'reconnected_at',
      kind: 'scalar',
      T: 4 /* ScalarType.UINT64 */,
    },
    {
      no: 10,
      name: 'disconnected_at',
      kind: 'scalar',
      T: 4 /* ScalarType.UINT64 */,
    },
  ]);

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): NatsKvUserInfo {
    return new NatsKvUserInfo().fromBinary(bytes, options);
  }

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): NatsKvUserInfo {
    return new NatsKvUserInfo().fromJson(jsonValue, options);
  }

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): NatsKvUserInfo {
    return new NatsKvUserInfo().fromJsonString(jsonString, options);
  }

  static equals(
    a: NatsKvUserInfo | PlainMessage<NatsKvUserInfo> | undefined,
    b: NatsKvUserInfo | PlainMessage<NatsKvUserInfo> | undefined,
  ): boolean {
    return proto3.util.equals(NatsKvUserInfo, a, b);
  }
}

/**
 * @generated from message plugnmeet.MediaServerConnInfo
 */
export class MediaServerConnInfo extends Message<MediaServerConnInfo> {
  /**
   * @generated from field: string url = 1;
   */
  url = '';

  /**
   * @generated from field: string token = 2;
   */
  token = '';

  /**
   * @generated from field: bool enabled_e2ee = 3;
   */
  enabledE2ee = false;

  constructor(data?: PartialMessage<MediaServerConnInfo>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = 'plugnmeet.MediaServerConnInfo';
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: 'url', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 2, name: 'token', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 3, name: 'enabled_e2ee', kind: 'scalar', T: 8 /* ScalarType.BOOL */ },
  ]);

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): MediaServerConnInfo {
    return new MediaServerConnInfo().fromBinary(bytes, options);
  }

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): MediaServerConnInfo {
    return new MediaServerConnInfo().fromJson(jsonValue, options);
  }

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): MediaServerConnInfo {
    return new MediaServerConnInfo().fromJsonString(jsonString, options);
  }

  static equals(
    a: MediaServerConnInfo | PlainMessage<MediaServerConnInfo> | undefined,
    b: MediaServerConnInfo | PlainMessage<MediaServerConnInfo> | undefined,
  ): boolean {
    return proto3.util.equals(MediaServerConnInfo, a, b);
  }
}

/**
 * @generated from message plugnmeet.NatsInitialData
 */
export class NatsInitialData extends Message<NatsInitialData> {
  /**
   * @generated from field: plugnmeet.NatsKvRoomInfo room = 1;
   */
  room?: NatsKvRoomInfo;

  /**
   * @generated from field: plugnmeet.NatsKvUserInfo local_user = 2;
   */
  localUser?: NatsKvUserInfo;

  /**
   * @generated from field: plugnmeet.MediaServerConnInfo media_server_info = 3;
   */
  mediaServerInfo?: MediaServerConnInfo;

  constructor(data?: PartialMessage<NatsInitialData>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = 'plugnmeet.NatsInitialData';
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: 'room', kind: 'message', T: NatsKvRoomInfo },
    { no: 2, name: 'local_user', kind: 'message', T: NatsKvUserInfo },
    {
      no: 3,
      name: 'media_server_info',
      kind: 'message',
      T: MediaServerConnInfo,
    },
  ]);

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): NatsInitialData {
    return new NatsInitialData().fromBinary(bytes, options);
  }

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): NatsInitialData {
    return new NatsInitialData().fromJson(jsonValue, options);
  }

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): NatsInitialData {
    return new NatsInitialData().fromJsonString(jsonString, options);
  }

  static equals(
    a: NatsInitialData | PlainMessage<NatsInitialData> | undefined,
    b: NatsInitialData | PlainMessage<NatsInitialData> | undefined,
  ): boolean {
    return proto3.util.equals(NatsInitialData, a, b);
  }
}

/**
 * @generated from message plugnmeet.NatsSystemNotification
 */
export class NatsSystemNotification extends Message<NatsSystemNotification> {
  /**
   * @generated from field: string id = 1;
   */
  id = '';

  /**
   * @generated from field: plugnmeet.NatsSystemNotificationTypes type = 2;
   */
  type = NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_INFO;

  /**
   * @generated from field: string msg = 3;
   */
  msg = '';

  /**
   * @generated from field: int64 sent_at = 4;
   */
  sentAt = protoInt64.zero;

  /**
   * @generated from field: bool with_sound = 5;
   */
  withSound = false;

  constructor(data?: PartialMessage<NatsSystemNotification>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = 'plugnmeet.NatsSystemNotification';
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: 'id', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    {
      no: 2,
      name: 'type',
      kind: 'enum',
      T: proto3.getEnumType(NatsSystemNotificationTypes),
    },
    { no: 3, name: 'msg', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 4, name: 'sent_at', kind: 'scalar', T: 3 /* ScalarType.INT64 */ },
    { no: 5, name: 'with_sound', kind: 'scalar', T: 8 /* ScalarType.BOOL */ },
  ]);

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): NatsSystemNotification {
    return new NatsSystemNotification().fromBinary(bytes, options);
  }

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): NatsSystemNotification {
    return new NatsSystemNotification().fromJson(jsonValue, options);
  }

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): NatsSystemNotification {
    return new NatsSystemNotification().fromJsonString(jsonString, options);
  }

  static equals(
    a:
      | NatsSystemNotification
      | PlainMessage<NatsSystemNotification>
      | undefined,
    b:
      | NatsSystemNotification
      | PlainMessage<NatsSystemNotification>
      | undefined,
  ): boolean {
    return proto3.util.equals(NatsSystemNotification, a, b);
  }
}

/**
 * @generated from message plugnmeet.NatsUserMetadataUpdate
 */
export class NatsUserMetadataUpdate extends Message<NatsUserMetadataUpdate> {
  /**
   * @generated from field: string user_id = 1;
   */
  userId = '';

  /**
   * @generated from field: string metadata = 2;
   */
  metadata = '';

  constructor(data?: PartialMessage<NatsUserMetadataUpdate>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = 'plugnmeet.NatsUserMetadataUpdate';
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: 'user_id', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 2, name: 'metadata', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): NatsUserMetadataUpdate {
    return new NatsUserMetadataUpdate().fromBinary(bytes, options);
  }

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): NatsUserMetadataUpdate {
    return new NatsUserMetadataUpdate().fromJson(jsonValue, options);
  }

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): NatsUserMetadataUpdate {
    return new NatsUserMetadataUpdate().fromJsonString(jsonString, options);
  }

  static equals(
    a:
      | NatsUserMetadataUpdate
      | PlainMessage<NatsUserMetadataUpdate>
      | undefined,
    b:
      | NatsUserMetadataUpdate
      | PlainMessage<NatsUserMetadataUpdate>
      | undefined,
  ): boolean {
    return proto3.util.equals(NatsUserMetadataUpdate, a, b);
  }
}

/**
 * @generated from message plugnmeet.ChatMessage
 */
export class ChatMessage extends Message<ChatMessage> {
  /**
   * @generated from field: string id = 1;
   */
  id = '';

  /**
   * @generated from field: string from_name = 2;
   */
  fromName = '';

  /**
   * @generated from field: string from_user_id = 3;
   */
  fromUserId = '';

  /**
   * @generated from field: optional string to_user_id = 5;
   */
  toUserId?: string;

  /**
   * @generated from field: bool is_private = 6;
   */
  isPrivate = false;

  /**
   * @generated from field: string message = 7;
   */
  message = '';

  constructor(data?: PartialMessage<ChatMessage>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = 'plugnmeet.ChatMessage';
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: 'id', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 2, name: 'from_name', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    {
      no: 3,
      name: 'from_user_id',
      kind: 'scalar',
      T: 9 /* ScalarType.STRING */,
    },
    {
      no: 5,
      name: 'to_user_id',
      kind: 'scalar',
      T: 9 /* ScalarType.STRING */,
      opt: true,
    },
    { no: 6, name: 'is_private', kind: 'scalar', T: 8 /* ScalarType.BOOL */ },
    { no: 7, name: 'message', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): ChatMessage {
    return new ChatMessage().fromBinary(bytes, options);
  }

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): ChatMessage {
    return new ChatMessage().fromJson(jsonValue, options);
  }

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): ChatMessage {
    return new ChatMessage().fromJsonString(jsonString, options);
  }

  static equals(
    a: ChatMessage | PlainMessage<ChatMessage> | undefined,
    b: ChatMessage | PlainMessage<ChatMessage> | undefined,
  ): boolean {
    return proto3.util.equals(ChatMessage, a, b);
  }
}

/**
 * @generated from message plugnmeet.DataChannelMessage
 */
export class DataChannelMessage extends Message<DataChannelMessage> {
  /**
   * @generated from field: string id = 1;
   */
  id = '';

  /**
   * @generated from field: plugnmeet.DataMsgBodyType type = 2;
   */
  type = DataMsgBodyType.UNKNOWN;

  /**
   * @generated from field: string from_user_id = 3;
   */
  fromUserId = '';

  /**
   * @generated from field: string to_user_id = 4;
   */
  toUserId = '';

  /**
   * @generated from field: string message = 5;
   */
  message = '';

  constructor(data?: PartialMessage<DataChannelMessage>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = 'plugnmeet.DataChannelMessage';
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: 'id', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    {
      no: 2,
      name: 'type',
      kind: 'enum',
      T: proto3.getEnumType(DataMsgBodyType),
    },
    {
      no: 3,
      name: 'from_user_id',
      kind: 'scalar',
      T: 9 /* ScalarType.STRING */,
    },
    { no: 4, name: 'to_user_id', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
    { no: 5, name: 'message', kind: 'scalar', T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): DataChannelMessage {
    return new DataChannelMessage().fromBinary(bytes, options);
  }

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): DataChannelMessage {
    return new DataChannelMessage().fromJson(jsonValue, options);
  }

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): DataChannelMessage {
    return new DataChannelMessage().fromJsonString(jsonString, options);
  }

  static equals(
    a: DataChannelMessage | PlainMessage<DataChannelMessage> | undefined,
    b: DataChannelMessage | PlainMessage<DataChannelMessage> | undefined,
  ): boolean {
    return proto3.util.equals(DataChannelMessage, a, b);
  }
}
