// @generated by protoc-gen-es v0.0.10 with parameter "target=js+dts"
// @generated from file plugnmeet_common_api.proto (package plugnmeet, syntax proto3)
/* eslint-disable */
/* @ts-nocheck */

import {proto3} from "@bufbuild/protobuf";
import {DataMsgBodyType} from "./plugnmeet_datamessage_pb.js";

/**
 * @generated from message plugnmeet.CommonResponse
 */
export const CommonResponse = proto3.makeMessageType(
  "plugnmeet.CommonResponse",
  () => [
    { no: 1, name: "status", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
    { no: 2, name: "msg", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ],
);

/**
 * @generated from message plugnmeet.VerifyTokenReq
 */
export const VerifyTokenReq = proto3.makeMessageType(
  "plugnmeet.VerifyTokenReq",
  () => [
    { no: 1, name: "is_production", kind: "scalar", T: 8 /* ScalarType.BOOL */, opt: true },
  ],
);

/**
 * @generated from message plugnmeet.VerifyTokenRes
 */
export const VerifyTokenRes = proto3.makeMessageType(
  "plugnmeet.VerifyTokenRes",
  () => [
    { no: 1, name: "status", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
    { no: 2, name: "msg", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "livekit_host", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 4, name: "token", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
  ],
);

/**
 * @generated from message plugnmeet.MuteUnMuteTrackReq
 */
export const MuteUnMuteTrackReq = proto3.makeMessageType(
  "plugnmeet.MuteUnMuteTrackReq",
  () => [
    { no: 1, name: "sid", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "room_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "user_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 4, name: "track_sid", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "muted", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
    { no: 6, name: "Requested_user_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ],
);

/**
 * @generated from message plugnmeet.RemoveParticipantReq
 */
export const RemoveParticipantReq = proto3.makeMessageType(
  "plugnmeet.RemoveParticipantReq",
  () => [
    { no: 1, name: "sid", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "room_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "user_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 4, name: "msg", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "block_user", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
  ],
);

/**
 * @generated from message plugnmeet.DataMessageReq
 */
export const DataMessageReq = proto3.makeMessageType(
  "plugnmeet.DataMessageReq",
  () => [
    { no: 1, name: "room_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "room_sid", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "user_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 4, name: "user_sid", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "msg_body_type", kind: "enum", T: proto3.getEnumType(DataMsgBodyType) },
    { no: 6, name: "msg", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 7, name: "Requested_user_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 8, name: "send_to", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
    { no: 9, name: "is_admin", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
  ],
);

