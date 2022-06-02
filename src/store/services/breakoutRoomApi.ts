import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  BreakoutRoomDurationReq,
  BreakoutRoomListsRes,
  CommonRes,
  CreateBreakoutRoomReq,
  JoinRoomReq,
  JoinRoomRes,
  SendMsgReq,
} from './breakoutRoomApiTypes';

export const breakoutRoomApi = createApi({
  reducerPath: 'breakoutRoomApi',
  baseQuery: fetchBaseQuery({
    baseUrl: (window as any).PLUG_N_MEET_SERVER_URL + '/api/breakoutRoom',
    prepareHeaders: (headers, api) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const token = api.getState().session.token;
      headers.append('Authorization', token);
      headers.append('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['List'],
  endpoints: (builder) => ({
    getBreakoutRooms: builder.query<BreakoutRoomListsRes, void>({
      query: () => 'listRooms',
      providesTags: ['List'],
    }),
    createBreakoutRooms: builder.mutation<CommonRes, CreateBreakoutRoomReq>({
      query(body) {
        return {
          url: 'create',
          method: 'POST',
          body,
        };
      },
      invalidatesTags: ['List'],
    }),
    increaseDuration: builder.mutation<CommonRes, BreakoutRoomDurationReq>({
      query(body) {
        return {
          url: 'increaseDuration',
          method: 'POST',
          body,
        };
      },
      invalidatesTags: ['List'],
    }),
    sendMsg: builder.mutation<CommonRes, SendMsgReq>({
      query(body) {
        return {
          url: 'sendMsg',
          method: 'POST',
          body,
        };
      },
    }),
    joinRoom: builder.mutation<JoinRoomRes, JoinRoomReq>({
      query(body) {
        return {
          url: 'join',
          method: 'POST',
          body,
        };
      },
    }),
    endSingleRoom: builder.mutation<CommonRes, string>({
      query(breakout_room_id) {
        return {
          url: 'endRoom',
          method: 'POST',
          body: { breakout_room_id },
        };
      },
      invalidatesTags: ['List'],
    }),
    endAllRooms: builder.mutation<CommonRes, void>({
      query() {
        return {
          url: 'endAllRooms',
          method: 'POST',
        };
      },
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
  useSendMsgMutation,
} = breakoutRoomApi;
