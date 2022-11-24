// @generated by protoc-gen-es v0.3.0 with parameter "target=js+dts"
// @generated from file plugnmeet_polls.proto (package plugnmeet, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import { proto3 } from "@bufbuild/protobuf";

/**
 * @generated from message plugnmeet.CreatePollReq
 */
export const CreatePollReq = proto3.makeMessageType(
  "plugnmeet.CreatePollReq",
  () => [
    { no: 1, name: "room_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "user_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "poll_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 4, name: "question", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "options", kind: "message", T: CreatePollOptions, repeated: true },
  ],
);

/**
 * @generated from message plugnmeet.CreatePollOptions
 */
export const CreatePollOptions = proto3.makeMessageType(
  "plugnmeet.CreatePollOptions",
  () => [
    { no: 1, name: "id", kind: "scalar", T: 13 /* ScalarType.UINT32 */ },
    { no: 2, name: "text", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ],
);

/**
 * @generated from message plugnmeet.PollInfo
 */
export const PollInfo = proto3.makeMessageType(
  "plugnmeet.PollInfo",
  () => [
    { no: 1, name: "id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "room_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "question", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 4, name: "options", kind: "message", T: CreatePollOptions, repeated: true },
    { no: 5, name: "is_running", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
    { no: 6, name: "created", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
    { no: 7, name: "created_by", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 8, name: "closed_by", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ],
);

/**
 * @generated from message plugnmeet.SubmitPollResponseReq
 */
export const SubmitPollResponseReq = proto3.makeMessageType(
  "plugnmeet.SubmitPollResponseReq",
  () => [
    { no: 1, name: "room_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "user_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 4, name: "poll_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "selected_option", kind: "scalar", T: 4 /* ScalarType.UINT64 */ },
  ],
);

/**
 * @generated from message plugnmeet.ClosePollReq
 */
export const ClosePollReq = proto3.makeMessageType(
  "plugnmeet.ClosePollReq",
  () => [
    { no: 1, name: "room_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "user_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "poll_id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ],
);

/**
 * @generated from message plugnmeet.PollResponsesResultOptions
 */
export const PollResponsesResultOptions = proto3.makeMessageType(
  "plugnmeet.PollResponsesResultOptions",
  () => [
    { no: 1, name: "id", kind: "scalar", T: 4 /* ScalarType.UINT64 */ },
    { no: 2, name: "text", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "vote_count", kind: "scalar", T: 4 /* ScalarType.UINT64 */ },
  ],
);

/**
 * @generated from message plugnmeet.PollResponsesResult
 */
export const PollResponsesResult = proto3.makeMessageType(
  "plugnmeet.PollResponsesResult",
  () => [
    { no: 1, name: "question", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "total_responses", kind: "scalar", T: 4 /* ScalarType.UINT64 */ },
    { no: 3, name: "options", kind: "message", T: PollResponsesResultOptions, repeated: true },
  ],
);

/**
 * @generated from message plugnmeet.PollsStats
 */
export const PollsStats = proto3.makeMessageType(
  "plugnmeet.PollsStats",
  () => [
    { no: 1, name: "total_polls", kind: "scalar", T: 4 /* ScalarType.UINT64 */ },
    { no: 2, name: "total_running", kind: "scalar", T: 4 /* ScalarType.UINT64 */ },
  ],
);

/**
 * @generated from message plugnmeet.PollResponse
 */
export const PollResponse = proto3.makeMessageType(
  "plugnmeet.PollResponse",
  () => [
    { no: 1, name: "status", kind: "scalar", T: 8 /* ScalarType.BOOL */ },
    { no: 2, name: "msg", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "poll_id", kind: "scalar", T: 9 /* ScalarType.STRING */, opt: true },
    { no: 4, name: "total_responses", kind: "scalar", T: 4 /* ScalarType.UINT64 */, opt: true },
    { no: 5, name: "voted", kind: "scalar", T: 4 /* ScalarType.UINT64 */, opt: true },
    { no: 6, name: "responses", kind: "map", K: 9 /* ScalarType.STRING */, V: {kind: "scalar", T: 9 /* ScalarType.STRING */} },
    { no: 7, name: "polls", kind: "message", T: PollInfo, repeated: true },
    { no: 8, name: "stats", kind: "message", T: PollsStats, opt: true },
    { no: 9, name: "total_polls", kind: "scalar", T: 4 /* ScalarType.UINT64 */, opt: true },
    { no: 10, name: "total_running", kind: "scalar", T: 4 /* ScalarType.UINT64 */, opt: true },
    { no: 11, name: "poll_responses_result", kind: "message", T: PollResponsesResult, opt: true },
  ],
);

