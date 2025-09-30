import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { toBinary } from '@bufbuild/protobuf';
import {
  BreakoutRoomRes,
  BreakoutRoomResSchema,
  BroadcastBreakoutRoomMsgReq,
  BroadcastBreakoutRoomMsgReqSchema,
  CreateBreakoutRoomsReq,
  CreateBreakoutRoomsReqSchema,
  EndBreakoutRoomReq,
  EndBreakoutRoomReqSchema,
  IncreaseBreakoutRoomDurationReq,
  IncreaseBreakoutRoomDurationReqSchema,
  JoinBreakoutRoomReq,
  JoinBreakoutRoomReqSchema,
} from 'plugnmeet-protocol-js';

import { RootState } from '..';
import { handleProtobufResponse, renewTokenOnError } from './utils';

export const breakoutRoomApi = createApi({
  reducerPath: 'breakoutRoomApi',
  baseQuery: fetchBaseQuery({
    baseUrl: (window as any).PLUG_N_MEET_SERVER_URL + '/api/breakoutRoom',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).session.token;
      headers.append('Authorization', token);
      return headers;
    },
  }),
  refetchOnMountOrArgChange: true,
  tagTypes: ['List', 'My_Rooms'],
  endpoints: (builder) => ({
    getBreakoutRooms: builder.query<BreakoutRoomRes, void>({
      query: () => {
        return {
          url: 'listRooms',
          responseHandler: handleProtobufResponse(BreakoutRoomResSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      providesTags: ['List'],
    }),
    createBreakoutRooms: builder.mutation<
      BreakoutRoomRes,
      CreateBreakoutRoomsReq
    >({
      query(body) {
        return {
          url: 'create',
          method: 'POST',
          body: toBinary(CreateBreakoutRoomsReqSchema, body),
          responseHandler: handleProtobufResponse(BreakoutRoomResSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      invalidatesTags: ['List'],
    }),
    increaseDuration: builder.mutation<
      BreakoutRoomRes,
      IncreaseBreakoutRoomDurationReq
    >({
      query(body) {
        return {
          url: 'increaseDuration',
          method: 'POST',
          body: toBinary(IncreaseBreakoutRoomDurationReqSchema, body),
          responseHandler: handleProtobufResponse(BreakoutRoomResSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      invalidatesTags: ['List'],
    }),
    broadcastBreakoutRoomMsg: builder.mutation<
      BreakoutRoomRes,
      BroadcastBreakoutRoomMsgReq
    >({
      query(body) {
        return {
          url: 'sendMsg',
          method: 'POST',
          body: toBinary(BroadcastBreakoutRoomMsgReqSchema, body),
          responseHandler: handleProtobufResponse(BreakoutRoomResSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
    }),
    joinRoom: builder.mutation<BreakoutRoomRes, JoinBreakoutRoomReq>({
      query(body) {
        return {
          url: 'join',
          method: 'POST',
          body: toBinary(JoinBreakoutRoomReqSchema, body),
          responseHandler: handleProtobufResponse(BreakoutRoomResSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
    }),
    getMyBreakoutRooms: builder.query<BreakoutRoomRes, void>({
      query: () => {
        return {
          url: 'myRooms',
          responseHandler: handleProtobufResponse(BreakoutRoomResSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      providesTags: ['My_Rooms'],
    }),
    endSingleRoom: builder.mutation<BreakoutRoomRes, EndBreakoutRoomReq>({
      query(body) {
        return {
          url: 'endRoom',
          method: 'POST',
          body: toBinary(EndBreakoutRoomReqSchema, body),
          responseHandler: handleProtobufResponse(BreakoutRoomResSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      invalidatesTags: ['List'],
    }),
    endAllRooms: builder.mutation<BreakoutRoomRes, void>({
      query() {
        return {
          url: 'endAllRooms',
          method: 'POST',
          responseHandler: handleProtobufResponse(BreakoutRoomResSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      invalidatesTags: ['List'],
    }),
  }),
});

export const {
  useGetBreakoutRoomsQuery,
  useCreateBreakoutRoomsMutation,
  useIncreaseDurationMutation,
  useJoinRoomMutation,
  useEndSingleRoomMutation,
  useEndAllRoomsMutation,
  useBroadcastBreakoutRoomMsgMutation,
  useGetMyBreakoutRoomsQuery,
} = breakoutRoomApi;
