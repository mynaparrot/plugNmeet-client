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
