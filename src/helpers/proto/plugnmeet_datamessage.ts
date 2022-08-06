/* eslint-disable */
import _m0 from 'protobufjs/minimal';

export const protobufPackage = 'plugnmeet';

export enum DataMsgType {
  USER = 0,
  SYSTEM = 1,
  WHITEBOARD = 2,
  UNRECOGNIZED = -1,
}

export function dataMsgTypeFromJSON(object: any): DataMsgType {
  switch (object) {
    case 0:
    case 'USER':
      return DataMsgType.USER;
    case 1:
    case 'SYSTEM':
      return DataMsgType.SYSTEM;
    case 2:
    case 'WHITEBOARD':
      return DataMsgType.WHITEBOARD;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return DataMsgType.UNRECOGNIZED;
  }
}

export function dataMsgTypeToJSON(object: DataMsgType): string {
  switch (object) {
    case DataMsgType.USER:
      return 'USER';
    case DataMsgType.SYSTEM:
      return 'SYSTEM';
    case DataMsgType.WHITEBOARD:
      return 'WHITEBOARD';
    case DataMsgType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}

export enum DataMsgBodyType {
  /** RAISE_HAND - SYSTEM type */
  RAISE_HAND = 0,
  LOWER_HAND = 1,
  OTHER_USER_LOWER_HAND = 2,
  FILE_UPLOAD = 3,
  INFO = 4,
  ALERT = 5,
  SEND_CHAT_MSGS = 6,
  RENEW_TOKEN = 7,
  UPDATE_LOCK_SETTINGS = 8,
  INIT_WHITEBOARD = 9,
  USER_VISIBILITY_CHANGE = 10,
  EXTERNAL_MEDIA_PLAYER_EVENTS = 11,
  POLL_CREATED = 12,
  NEW_POLL_RESPONSE = 13,
  POLL_CLOSED = 14,
  JOIN_BREAKOUT_ROOM = 15,
  /** CHAT - USER type */
  CHAT = 16,
  /** SCENE_UPDATE - WHITEBOARD type */
  SCENE_UPDATE = 17,
  POINTER_UPDATE = 18,
  ADD_WHITEBOARD_FILE = 19,
  ADD_WHITEBOARD_OFFICE_FILE = 20,
  PAGE_CHANGE = 21,
  UNRECOGNIZED = -1,
}

export function dataMsgBodyTypeFromJSON(object: any): DataMsgBodyType {
  switch (object) {
    case 0:
    case 'RAISE_HAND':
      return DataMsgBodyType.RAISE_HAND;
    case 1:
    case 'LOWER_HAND':
      return DataMsgBodyType.LOWER_HAND;
    case 2:
    case 'OTHER_USER_LOWER_HAND':
      return DataMsgBodyType.OTHER_USER_LOWER_HAND;
    case 3:
    case 'FILE_UPLOAD':
      return DataMsgBodyType.FILE_UPLOAD;
    case 4:
    case 'INFO':
      return DataMsgBodyType.INFO;
    case 5:
    case 'ALERT':
      return DataMsgBodyType.ALERT;
    case 6:
    case 'SEND_CHAT_MSGS':
      return DataMsgBodyType.SEND_CHAT_MSGS;
    case 7:
    case 'RENEW_TOKEN':
      return DataMsgBodyType.RENEW_TOKEN;
    case 8:
    case 'UPDATE_LOCK_SETTINGS':
      return DataMsgBodyType.UPDATE_LOCK_SETTINGS;
    case 9:
    case 'INIT_WHITEBOARD':
      return DataMsgBodyType.INIT_WHITEBOARD;
    case 10:
    case 'USER_VISIBILITY_CHANGE':
      return DataMsgBodyType.USER_VISIBILITY_CHANGE;
    case 11:
    case 'EXTERNAL_MEDIA_PLAYER_EVENTS':
      return DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS;
    case 12:
    case 'POLL_CREATED':
      return DataMsgBodyType.POLL_CREATED;
    case 13:
    case 'NEW_POLL_RESPONSE':
      return DataMsgBodyType.NEW_POLL_RESPONSE;
    case 14:
    case 'POLL_CLOSED':
      return DataMsgBodyType.POLL_CLOSED;
    case 15:
    case 'JOIN_BREAKOUT_ROOM':
      return DataMsgBodyType.JOIN_BREAKOUT_ROOM;
    case 16:
    case 'CHAT':
      return DataMsgBodyType.CHAT;
    case 17:
    case 'SCENE_UPDATE':
      return DataMsgBodyType.SCENE_UPDATE;
    case 18:
    case 'POINTER_UPDATE':
      return DataMsgBodyType.POINTER_UPDATE;
    case 19:
    case 'ADD_WHITEBOARD_FILE':
      return DataMsgBodyType.ADD_WHITEBOARD_FILE;
    case 20:
    case 'ADD_WHITEBOARD_OFFICE_FILE':
      return DataMsgBodyType.ADD_WHITEBOARD_OFFICE_FILE;
    case 21:
    case 'PAGE_CHANGE':
      return DataMsgBodyType.PAGE_CHANGE;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return DataMsgBodyType.UNRECOGNIZED;
  }
}

export function dataMsgBodyTypeToJSON(object: DataMsgBodyType): string {
  switch (object) {
    case DataMsgBodyType.RAISE_HAND:
      return 'RAISE_HAND';
    case DataMsgBodyType.LOWER_HAND:
      return 'LOWER_HAND';
    case DataMsgBodyType.OTHER_USER_LOWER_HAND:
      return 'OTHER_USER_LOWER_HAND';
    case DataMsgBodyType.FILE_UPLOAD:
      return 'FILE_UPLOAD';
    case DataMsgBodyType.INFO:
      return 'INFO';
    case DataMsgBodyType.ALERT:
      return 'ALERT';
    case DataMsgBodyType.SEND_CHAT_MSGS:
      return 'SEND_CHAT_MSGS';
    case DataMsgBodyType.RENEW_TOKEN:
      return 'RENEW_TOKEN';
    case DataMsgBodyType.UPDATE_LOCK_SETTINGS:
      return 'UPDATE_LOCK_SETTINGS';
    case DataMsgBodyType.INIT_WHITEBOARD:
      return 'INIT_WHITEBOARD';
    case DataMsgBodyType.USER_VISIBILITY_CHANGE:
      return 'USER_VISIBILITY_CHANGE';
    case DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS:
      return 'EXTERNAL_MEDIA_PLAYER_EVENTS';
    case DataMsgBodyType.POLL_CREATED:
      return 'POLL_CREATED';
    case DataMsgBodyType.NEW_POLL_RESPONSE:
      return 'NEW_POLL_RESPONSE';
    case DataMsgBodyType.POLL_CLOSED:
      return 'POLL_CLOSED';
    case DataMsgBodyType.JOIN_BREAKOUT_ROOM:
      return 'JOIN_BREAKOUT_ROOM';
    case DataMsgBodyType.CHAT:
      return 'CHAT';
    case DataMsgBodyType.SCENE_UPDATE:
      return 'SCENE_UPDATE';
    case DataMsgBodyType.POINTER_UPDATE:
      return 'POINTER_UPDATE';
    case DataMsgBodyType.ADD_WHITEBOARD_FILE:
      return 'ADD_WHITEBOARD_FILE';
    case DataMsgBodyType.ADD_WHITEBOARD_OFFICE_FILE:
      return 'ADD_WHITEBOARD_OFFICE_FILE';
    case DataMsgBodyType.PAGE_CHANGE:
      return 'PAGE_CHANGE';
    case DataMsgBodyType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}

export interface DataMessage {
  type: DataMsgType;
  messageId?: string | undefined;
  roomSid: string;
  roomId: string;
  to?: string | undefined;
  body: DataMsgBody | undefined;
}

export interface DataMsgBody {
  type: DataMsgBodyType;
  messageId?: string | undefined;
  time?: string | undefined;
  from: DataMsgReqFrom | undefined;
  msg: string;
  isPrivate?: number | undefined;
}

export interface DataMsgReqFrom {
  sid: string;
  userId: string;
  name?: string | undefined;
}

function createBaseDataMessage(): DataMessage {
  return {
    type: 0,
    messageId: undefined,
    roomSid: '',
    roomId: '',
    to: undefined,
    body: undefined,
  };
}

export const DataMessage = {
  encode(
    message: DataMessage,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.type !== 0) {
      writer.uint32(8).int32(message.type);
    }
    if (message.messageId !== undefined) {
      writer.uint32(18).string(message.messageId);
    }
    if (message.roomSid !== '') {
      writer.uint32(26).string(message.roomSid);
    }
    if (message.roomId !== '') {
      writer.uint32(34).string(message.roomId);
    }
    if (message.to !== undefined) {
      writer.uint32(42).string(message.to);
    }
    if (message.body !== undefined) {
      DataMsgBody.encode(message.body, writer.uint32(50).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataMessage {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.type = reader.int32() as any;
          break;
        case 2:
          message.messageId = reader.string();
          break;
        case 3:
          message.roomSid = reader.string();
          break;
        case 4:
          message.roomId = reader.string();
          break;
        case 5:
          message.to = reader.string();
          break;
        case 6:
          message.body = DataMsgBody.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): DataMessage {
    return {
      type: isSet(object.type) ? dataMsgTypeFromJSON(object.type) : 0,
      messageId: isSet(object.messageId) ? String(object.messageId) : undefined,
      roomSid: isSet(object.roomSid) ? String(object.roomSid) : '',
      roomId: isSet(object.roomId) ? String(object.roomId) : '',
      to: isSet(object.to) ? String(object.to) : undefined,
      body: isSet(object.body) ? DataMsgBody.fromJSON(object.body) : undefined,
    };
  },

  toJSON(message: DataMessage): unknown {
    const obj: any = {};
    message.type !== undefined && (obj.type = dataMsgTypeToJSON(message.type));
    message.messageId !== undefined && (obj.messageId = message.messageId);
    message.roomSid !== undefined && (obj.roomSid = message.roomSid);
    message.roomId !== undefined && (obj.roomId = message.roomId);
    message.to !== undefined && (obj.to = message.to);
    message.body !== undefined &&
      (obj.body = message.body ? DataMsgBody.toJSON(message.body) : undefined);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<DataMessage>, I>>(
    object: I,
  ): DataMessage {
    const message = createBaseDataMessage();
    message.type = object.type ?? 0;
    message.messageId = object.messageId ?? undefined;
    message.roomSid = object.roomSid ?? '';
    message.roomId = object.roomId ?? '';
    message.to = object.to ?? undefined;
    message.body =
      object.body !== undefined && object.body !== null
        ? DataMsgBody.fromPartial(object.body)
        : undefined;
    return message;
  },
};

function createBaseDataMsgBody(): DataMsgBody {
  return {
    type: 0,
    messageId: undefined,
    time: undefined,
    from: undefined,
    msg: '',
    isPrivate: undefined,
  };
}

export const DataMsgBody = {
  encode(
    message: DataMsgBody,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.type !== 0) {
      writer.uint32(8).int32(message.type);
    }
    if (message.messageId !== undefined) {
      writer.uint32(18).string(message.messageId);
    }
    if (message.time !== undefined) {
      writer.uint32(26).string(message.time);
    }
    if (message.from !== undefined) {
      DataMsgReqFrom.encode(message.from, writer.uint32(34).fork()).ldelim();
    }
    if (message.msg !== '') {
      writer.uint32(42).string(message.msg);
    }
    if (message.isPrivate !== undefined) {
      writer.uint32(48).uint32(message.isPrivate);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataMsgBody {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataMsgBody();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.type = reader.int32() as any;
          break;
        case 2:
          message.messageId = reader.string();
          break;
        case 3:
          message.time = reader.string();
          break;
        case 4:
          message.from = DataMsgReqFrom.decode(reader, reader.uint32());
          break;
        case 5:
          message.msg = reader.string();
          break;
        case 6:
          message.isPrivate = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): DataMsgBody {
    return {
      type: isSet(object.type) ? dataMsgBodyTypeFromJSON(object.type) : 0,
      messageId: isSet(object.messageId) ? String(object.messageId) : undefined,
      time: isSet(object.time) ? String(object.time) : undefined,
      from: isSet(object.from)
        ? DataMsgReqFrom.fromJSON(object.from)
        : undefined,
      msg: isSet(object.msg) ? String(object.msg) : '',
      isPrivate: isSet(object.isPrivate) ? Number(object.isPrivate) : undefined,
    };
  },

  toJSON(message: DataMsgBody): unknown {
    const obj: any = {};
    message.type !== undefined &&
      (obj.type = dataMsgBodyTypeToJSON(message.type));
    message.messageId !== undefined && (obj.messageId = message.messageId);
    message.time !== undefined && (obj.time = message.time);
    message.from !== undefined &&
      (obj.from = message.from
        ? DataMsgReqFrom.toJSON(message.from)
        : undefined);
    message.msg !== undefined && (obj.msg = message.msg);
    message.isPrivate !== undefined &&
      (obj.isPrivate = Math.round(message.isPrivate));
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<DataMsgBody>, I>>(
    object: I,
  ): DataMsgBody {
    const message = createBaseDataMsgBody();
    message.type = object.type ?? 0;
    message.messageId = object.messageId ?? undefined;
    message.time = object.time ?? undefined;
    message.from =
      object.from !== undefined && object.from !== null
        ? DataMsgReqFrom.fromPartial(object.from)
        : undefined;
    message.msg = object.msg ?? '';
    message.isPrivate = object.isPrivate ?? undefined;
    return message;
  },
};

function createBaseDataMsgReqFrom(): DataMsgReqFrom {
  return { sid: '', userId: '', name: undefined };
}

export const DataMsgReqFrom = {
  encode(
    message: DataMsgReqFrom,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.sid !== '') {
      writer.uint32(10).string(message.sid);
    }
    if (message.userId !== '') {
      writer.uint32(18).string(message.userId);
    }
    if (message.name !== undefined) {
      writer.uint32(26).string(message.name);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DataMsgReqFrom {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataMsgReqFrom();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sid = reader.string();
          break;
        case 2:
          message.userId = reader.string();
          break;
        case 3:
          message.name = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): DataMsgReqFrom {
    return {
      sid: isSet(object.sid) ? String(object.sid) : '',
      userId: isSet(object.userId) ? String(object.userId) : '',
      name: isSet(object.name) ? String(object.name) : undefined,
    };
  },

  toJSON(message: DataMsgReqFrom): unknown {
    const obj: any = {};
    message.sid !== undefined && (obj.sid = message.sid);
    message.userId !== undefined && (obj.userId = message.userId);
    message.name !== undefined && (obj.name = message.name);
    return obj;
  },

  fromPartial<I extends Exact<DeepPartial<DataMsgReqFrom>, I>>(
    object: I,
  ): DataMsgReqFrom {
    const message = createBaseDataMsgReqFrom();
    message.sid = object.sid ?? '';
    message.userId = object.userId ?? '';
    message.name = object.name ?? undefined;
    return message;
  },
};

type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | undefined;

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends { $case: string }
  ? { [K in keyof Omit<T, '$case'>]?: DeepPartial<T[K]> } & {
      $case: T['$case'];
    }
  : T extends {}
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
  ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & Record<
        Exclude<keyof I, KeysOfUnion<P>>,
        never
      >;

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
