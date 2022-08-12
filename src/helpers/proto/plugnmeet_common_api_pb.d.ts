// @generated by protoc-gen-es v0.0.10 with parameter "target=js+dts"
// @generated from file plugnmeet_common_api.proto (package plugnmeet, syntax proto3)
/* eslint-disable */
/* @ts-nocheck */

import type {
  BinaryReadOptions,
  FieldList,
  JsonReadOptions,
  JsonValue,
  PartialMessage,
  PlainMessage,
} from '@bufbuild/protobuf';
import { Message, proto3 } from '@bufbuild/protobuf';
import type { DataMsgBodyType } from './plugnmeet_datamessage_pb.js';

/**
 * @generated from enum plugnmeet.SwitchPresenterTask
 */
export declare enum SwitchPresenterTask {
  /**
   * @generated from enum value: PROMOTE = 0;
   */
  PROMOTE = 0,

  /**
   * @generated from enum value: DEMOTE = 1;
   */
  DEMOTE = 1,
}

/**
 * @generated from enum plugnmeet.ExternalMediaPlayerTask
 */
export declare enum ExternalMediaPlayerTask {
  /**
   * @generated from enum value: START_PLAYBACK = 0;
   */
  START_PLAYBACK = 0,

  /**
   * @generated from enum value: END_PLAYBACK = 1;
   */
  END_PLAYBACK = 1,
}

/**
 * @generated from enum plugnmeet.ExternalDisplayLinkTask
 */
export declare enum ExternalDisplayLinkTask {
  /**
   * @generated from enum value: START_EXTERNAL_LINK = 0;
   */
  START_EXTERNAL_LINK = 0,

  /**
   * @generated from enum value: STOP_EXTERNAL_LINK = 1;
   */
  STOP_EXTERNAL_LINK = 1,
}

/**
 * @generated from message plugnmeet.CommonResponse
 */
export declare class CommonResponse extends Message<CommonResponse> {
  /**
   * @generated from field: bool status = 1;
   */
  status: boolean;

  /**
   * @generated from field: string msg = 2;
   */
  msg: string;

  constructor(data?: PartialMessage<CommonResponse>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.CommonResponse';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): CommonResponse;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): CommonResponse;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): CommonResponse;

  static equals(
    a: CommonResponse | PlainMessage<CommonResponse> | undefined,
    b: CommonResponse | PlainMessage<CommonResponse> | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.VerifyTokenReq
 */
export declare class VerifyTokenReq extends Message<VerifyTokenReq> {
  /**
   * @generated from field: optional bool is_production = 1;
   */
  isProduction?: boolean;

  constructor(data?: PartialMessage<VerifyTokenReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.VerifyTokenReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): VerifyTokenReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): VerifyTokenReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): VerifyTokenReq;

  static equals(
    a: VerifyTokenReq | PlainMessage<VerifyTokenReq> | undefined,
    b: VerifyTokenReq | PlainMessage<VerifyTokenReq> | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.VerifyTokenRes
 */
export declare class VerifyTokenRes extends Message<VerifyTokenRes> {
  /**
   * @generated from field: bool status = 1;
   */
  status: boolean;

  /**
   * @generated from field: string msg = 2;
   */
  msg: string;

  /**
   * @generated from field: optional string livekit_host = 3;
   */
  livekitHost?: string;

  /**
   * @generated from field: optional string token = 4;
   */
  token?: string;

  constructor(data?: PartialMessage<VerifyTokenRes>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.VerifyTokenRes';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): VerifyTokenRes;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): VerifyTokenRes;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): VerifyTokenRes;

  static equals(
    a: VerifyTokenRes | PlainMessage<VerifyTokenRes> | undefined,
    b: VerifyTokenRes | PlainMessage<VerifyTokenRes> | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.MuteUnMuteTrackReq
 */
export declare class MuteUnMuteTrackReq extends Message<MuteUnMuteTrackReq> {
  /**
   * @generated from field: string sid = 1;
   */
  sid: string;

  /**
   * @generated from field: string room_id = 2;
   */
  roomId: string;

  /**
   * @generated from field: string user_id = 3;
   */
  userId: string;

  /**
   * @generated from field: string track_sid = 4;
   */
  trackSid: string;

  /**
   * @generated from field: bool muted = 5;
   */
  muted: boolean;

  /**
   * @generated from field: string Requested_user_id = 6;
   */
  RequestedUserId: string;

  constructor(data?: PartialMessage<MuteUnMuteTrackReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.MuteUnMuteTrackReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): MuteUnMuteTrackReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): MuteUnMuteTrackReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): MuteUnMuteTrackReq;

  static equals(
    a: MuteUnMuteTrackReq | PlainMessage<MuteUnMuteTrackReq> | undefined,
    b: MuteUnMuteTrackReq | PlainMessage<MuteUnMuteTrackReq> | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.RemoveParticipantReq
 */
export declare class RemoveParticipantReq extends Message<RemoveParticipantReq> {
  /**
   * @generated from field: string sid = 1;
   */
  sid: string;

  /**
   * @generated from field: string room_id = 2;
   */
  roomId: string;

  /**
   * @generated from field: string user_id = 3;
   */
  userId: string;

  /**
   * @generated from field: string msg = 4;
   */
  msg: string;

  /**
   * @generated from field: bool block_user = 5;
   */
  blockUser: boolean;

  constructor(data?: PartialMessage<RemoveParticipantReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.RemoveParticipantReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): RemoveParticipantReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): RemoveParticipantReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): RemoveParticipantReq;

  static equals(
    a: RemoveParticipantReq | PlainMessage<RemoveParticipantReq> | undefined,
    b: RemoveParticipantReq | PlainMessage<RemoveParticipantReq> | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.DataMessageReq
 */
export declare class DataMessageReq extends Message<DataMessageReq> {
  /**
   * @generated from field: string room_id = 1;
   */
  roomId: string;

  /**
   * @generated from field: string room_sid = 2;
   */
  roomSid: string;

  /**
   * @generated from field: string user_id = 3;
   */
  userId: string;

  /**
   * @generated from field: string user_sid = 4;
   */
  userSid: string;

  /**
   * @generated from field: plugnmeet.DataMsgBodyType msg_body_type = 5;
   */
  msgBodyType: DataMsgBodyType;

  /**
   * @generated from field: string msg = 6;
   */
  msg: string;

  /**
   * @generated from field: string Requested_user_id = 7;
   */
  RequestedUserId: string;

  /**
   * @generated from field: repeated string send_to = 8;
   */
  sendTo: string[];

  /**
   * @generated from field: bool is_admin = 9;
   */
  isAdmin: boolean;

  constructor(data?: PartialMessage<DataMessageReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.DataMessageReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): DataMessageReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): DataMessageReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): DataMessageReq;

  static equals(
    a: DataMessageReq | PlainMessage<DataMessageReq> | undefined,
    b: DataMessageReq | PlainMessage<DataMessageReq> | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.RoomEndAPIReq
 */
export declare class RoomEndAPIReq extends Message<RoomEndAPIReq> {
  /**
   * @generated from field: string room_id = 1;
   */
  roomId: string;

  constructor(data?: PartialMessage<RoomEndAPIReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.RoomEndAPIReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): RoomEndAPIReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): RoomEndAPIReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): RoomEndAPIReq;

  static equals(
    a: RoomEndAPIReq | PlainMessage<RoomEndAPIReq> | undefined,
    b: RoomEndAPIReq | PlainMessage<RoomEndAPIReq> | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.ChangeVisibilityRes
 */
export declare class ChangeVisibilityRes extends Message<ChangeVisibilityRes> {
  /**
   * @generated from field: string room_id = 1;
   */
  roomId: string;

  /**
   * @generated from field: optional bool visible_notepad = 2;
   */
  visibleNotepad?: boolean;

  /**
   * @generated from field: optional bool visible_white_board = 3;
   */
  visibleWhiteBoard?: boolean;

  constructor(data?: PartialMessage<ChangeVisibilityRes>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.ChangeVisibilityRes';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): ChangeVisibilityRes;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): ChangeVisibilityRes;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): ChangeVisibilityRes;

  static equals(
    a: ChangeVisibilityRes | PlainMessage<ChangeVisibilityRes> | undefined,
    b: ChangeVisibilityRes | PlainMessage<ChangeVisibilityRes> | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.SwitchPresenterReq
 */
export declare class SwitchPresenterReq extends Message<SwitchPresenterReq> {
  /**
   * @generated from field: plugnmeet.SwitchPresenterTask task = 1;
   */
  task: SwitchPresenterTask;

  /**
   * @generated from field: string user_id = 2;
   */
  userId: string;

  /**
   * @generated from field: string room_id = 3;
   */
  roomId: string;

  /**
   * @generated from field: string Requested_user_id = 4;
   */
  RequestedUserId: string;

  constructor(data?: PartialMessage<SwitchPresenterReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.SwitchPresenterReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): SwitchPresenterReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): SwitchPresenterReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): SwitchPresenterReq;

  static equals(
    a: SwitchPresenterReq | PlainMessage<SwitchPresenterReq> | undefined,
    b: SwitchPresenterReq | PlainMessage<SwitchPresenterReq> | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.ExternalMediaPlayerReq
 */
export declare class ExternalMediaPlayerReq extends Message<ExternalMediaPlayerReq> {
  /**
   * @generated from field: plugnmeet.ExternalMediaPlayerTask task = 1;
   */
  task: ExternalMediaPlayerTask;

  /**
   * @generated from field: optional string url = 2;
   */
  url?: string;

  /**
   * @generated from field: optional double seek_to = 3;
   */
  seekTo?: number;

  /**
   * @generated from field: string room_id = 4;
   */
  roomId: string;

  /**
   * @generated from field: string user_id = 5;
   */
  userId: string;

  constructor(data?: PartialMessage<ExternalMediaPlayerReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.ExternalMediaPlayerReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): ExternalMediaPlayerReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): ExternalMediaPlayerReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): ExternalMediaPlayerReq;

  static equals(
    a:
      | ExternalMediaPlayerReq
      | PlainMessage<ExternalMediaPlayerReq>
      | undefined,
    b:
      | ExternalMediaPlayerReq
      | PlainMessage<ExternalMediaPlayerReq>
      | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.ExternalDisplayLinkReq
 */
export declare class ExternalDisplayLinkReq extends Message<ExternalDisplayLinkReq> {
  /**
   * @generated from field: plugnmeet.ExternalDisplayLinkTask task = 1;
   */
  task: ExternalDisplayLinkTask;

  /**
   * @generated from field: optional string url = 2;
   */
  url?: string;

  /**
   * @generated from field: string room_id = 4;
   */
  roomId: string;

  /**
   * @generated from field: string user_id = 5;
   */
  userId: string;

  constructor(data?: PartialMessage<ExternalDisplayLinkReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.ExternalDisplayLinkReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): ExternalDisplayLinkReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): ExternalDisplayLinkReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): ExternalDisplayLinkReq;

  static equals(
    a:
      | ExternalDisplayLinkReq
      | PlainMessage<ExternalDisplayLinkReq>
      | undefined,
    b:
      | ExternalDisplayLinkReq
      | PlainMessage<ExternalDisplayLinkReq>
      | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.CreateEtherpadSessionRes
 */
export declare class CreateEtherpadSessionRes extends Message<CreateEtherpadSessionRes> {
  /**
   * @generated from field: bool status = 1;
   */
  status: boolean;

  /**
   * @generated from field: string msg = 2;
   */
  msg: string;

  /**
   * @generated from field: optional string pad_id = 3;
   */
  padId?: string;

  /**
   * @generated from field: optional string readonly_pad_id = 4;
   */
  readonlyPadId?: string;

  constructor(data?: PartialMessage<CreateEtherpadSessionRes>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.CreateEtherpadSessionRes';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): CreateEtherpadSessionRes;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): CreateEtherpadSessionRes;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): CreateEtherpadSessionRes;

  static equals(
    a:
      | CreateEtherpadSessionRes
      | PlainMessage<CreateEtherpadSessionRes>
      | undefined,
    b:
      | CreateEtherpadSessionRes
      | PlainMessage<CreateEtherpadSessionRes>
      | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.CleanEtherpadReq
 */
export declare class CleanEtherpadReq extends Message<CleanEtherpadReq> {
  /**
   * @generated from field: string room_id = 1;
   */
  roomId: string;

  /**
   * @generated from field: string node_id = 2;
   */
  nodeId: string;

  /**
   * @generated from field: string pad_id = 3;
   */
  padId: string;

  constructor(data?: PartialMessage<CleanEtherpadReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.CleanEtherpadReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): CleanEtherpadReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): CleanEtherpadReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): CleanEtherpadReq;

  static equals(
    a: CleanEtherpadReq | PlainMessage<CleanEtherpadReq> | undefined,
    b: CleanEtherpadReq | PlainMessage<CleanEtherpadReq> | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.ChangeEtherpadStatusReq
 */
export declare class ChangeEtherpadStatusReq extends Message<ChangeEtherpadStatusReq> {
  /**
   * @generated from field: string room_id = 1;
   */
  roomId: string;

  /**
   * @generated from field: bool is_active = 2;
   */
  isActive: boolean;

  constructor(data?: PartialMessage<ChangeEtherpadStatusReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.ChangeEtherpadStatusReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): ChangeEtherpadStatusReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): ChangeEtherpadStatusReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): ChangeEtherpadStatusReq;

  static equals(
    a:
      | ChangeEtherpadStatusReq
      | PlainMessage<ChangeEtherpadStatusReq>
      | undefined,
    b:
      | ChangeEtherpadStatusReq
      | PlainMessage<ChangeEtherpadStatusReq>
      | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.ApproveWaitingUsersReq
 */
export declare class ApproveWaitingUsersReq extends Message<ApproveWaitingUsersReq> {
  /**
   * @generated from field: string room_id = 1;
   */
  roomId: string;

  /**
   * @generated from field: string user_id = 2;
   */
  userId: string;

  constructor(data?: PartialMessage<ApproveWaitingUsersReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.ApproveWaitingUsersReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): ApproveWaitingUsersReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): ApproveWaitingUsersReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): ApproveWaitingUsersReq;

  static equals(
    a:
      | ApproveWaitingUsersReq
      | PlainMessage<ApproveWaitingUsersReq>
      | undefined,
    b:
      | ApproveWaitingUsersReq
      | PlainMessage<ApproveWaitingUsersReq>
      | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.UpdateWaitingRoomMessageReq
 */
export declare class UpdateWaitingRoomMessageReq extends Message<UpdateWaitingRoomMessageReq> {
  /**
   * @generated from field: string room_id = 1;
   */
  roomId: string;

  /**
   * @generated from field: string msg = 2;
   */
  msg: string;

  constructor(data?: PartialMessage<UpdateWaitingRoomMessageReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.UpdateWaitingRoomMessageReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): UpdateWaitingRoomMessageReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): UpdateWaitingRoomMessageReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): UpdateWaitingRoomMessageReq;

  static equals(
    a:
      | UpdateWaitingRoomMessageReq
      | PlainMessage<UpdateWaitingRoomMessageReq>
      | undefined,
    b:
      | UpdateWaitingRoomMessageReq
      | PlainMessage<UpdateWaitingRoomMessageReq>
      | undefined,
  ): boolean;
}

/**
 * @generated from message plugnmeet.UpdateUserLockSettingsReq
 */
export declare class UpdateUserLockSettingsReq extends Message<UpdateUserLockSettingsReq> {
  /**
   * @generated from field: string room_sid = 1;
   */
  roomSid: string;

  /**
   * @generated from field: string room_id = 2;
   */
  roomId: string;

  /**
   * @generated from field: string user_id = 3;
   */
  userId: string;

  /**
   * @generated from field: string service = 4;
   */
  service: string;

  /**
   * @generated from field: string direction = 5;
   */
  direction: string;

  /**
   * @generated from field: string Requested_user_id = 6;
   */
  RequestedUserId: string;

  constructor(data?: PartialMessage<UpdateUserLockSettingsReq>);

  static readonly runtime: typeof proto3;
  static readonly typeName = 'plugnmeet.UpdateUserLockSettingsReq';
  static readonly fields: FieldList;

  static fromBinary(
    bytes: Uint8Array,
    options?: Partial<BinaryReadOptions>,
  ): UpdateUserLockSettingsReq;

  static fromJson(
    jsonValue: JsonValue,
    options?: Partial<JsonReadOptions>,
  ): UpdateUserLockSettingsReq;

  static fromJsonString(
    jsonString: string,
    options?: Partial<JsonReadOptions>,
  ): UpdateUserLockSettingsReq;

  static equals(
    a:
      | UpdateUserLockSettingsReq
      | PlainMessage<UpdateUserLockSettingsReq>
      | undefined,
    b:
      | UpdateUserLockSettingsReq
      | PlainMessage<UpdateUserLockSettingsReq>
      | undefined,
  ): boolean;
}
