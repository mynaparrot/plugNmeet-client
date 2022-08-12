import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  PollResponse,
  CreatePollReq,
  SubmitPollResponseReq,
  ClosePollReq,
} from '../../helpers/proto/plugnmeet_polls_pb';

export const pollsApi = createApi({
  reducerPath: 'pollsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: (window as any).PLUG_N_MEET_SERVER_URL + '/api/polls',
    prepareHeaders: (headers, api) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const token = api.getState().session.token;
      headers.append('Authorization', token);
      headers.append('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: [
    'List',
    'PollsStats',
    'Count',
    'Selected',
    'PollDetails',
    'PollResult',
  ],
  endpoints: (builder) => ({
    getPollLists: builder.query<PollResponse, void>({
      query: () => {
        return {
          url: 'listPolls',
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            return PollResponse.fromBinary(new Uint8Array(buf)).toJson();
          },
        };
      },
      providesTags: ['List'],
    }),
    getCountTotalResponses: builder.query<PollResponse, string>({
      query: (poll_id) => {
        return {
          url: `countTotalResponses/${poll_id}`,
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            return PollResponse.fromBinary(new Uint8Array(buf)).toJson();
          },
        };
      },
      providesTags: (result) => {
        return result?.status
          ? ['Count', { type: 'Count' as const, id: result?.pollId }]
          : ['Count'];
      },
    }),
    getUserSelectedOption: builder.query<
      PollResponse,
      { pollId: string; userId: string }
    >({
      query: ({ pollId, userId }) => {
        return {
          url: `userSelectedOption/${pollId}/${userId}`,
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            return PollResponse.fromBinary(new Uint8Array(buf)).toJson();
          },
        };
      },
      providesTags: (result) => {
        return result?.status
          ? ['Selected', { type: 'Selected' as const, id: result.pollId }]
          : ['Selected'];
      },
    }),
    getPollResponsesDetails: builder.query<PollResponse, string>({
      query: (poll_id) => {
        return {
          url: `pollResponsesDetails/${poll_id}`,
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            return PollResponse.fromBinary(new Uint8Array(buf)).toJson();
          },
        };
      },
      providesTags: (result) => {
        return result?.status
          ? ['PollDetails', { type: 'PollDetails' as const, id: result.pollId }]
          : ['PollDetails'];
      },
    }),
    getPollResponsesResult: builder.query<PollResponse, string>({
      query: (poll_id) => {
        return {
          url: `pollResponsesResult/${poll_id}`,
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            return PollResponse.fromBinary(new Uint8Array(buf)).toJson();
          },
        };
      },
      providesTags: (result) => {
        return result?.status
          ? ['PollResult', { type: 'PollResult' as const, id: result.pollId }]
          : ['PollResult'];
      },
    }),
    getPollsStats: builder.query<PollResponse, void>({
      query: () => {
        return {
          url: 'pollsStats',
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            return PollResponse.fromBinary(new Uint8Array(buf)).toJson();
          },
        };
      },
      providesTags: ['PollsStats'],
    }),
    createPoll: builder.mutation<PollResponse, CreatePollReq>({
      query(body) {
        return {
          url: 'create',
          method: 'POST',
          body: body.toBinary(),
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            return PollResponse.fromBinary(new Uint8Array(buf)).toJson();
          },
        };
      },
      invalidatesTags: ['List', 'PollsStats'],
    }),
    addResponse: builder.mutation<PollResponse, SubmitPollResponseReq>({
      query(body) {
        return {
          url: 'submitResponse',
          method: 'POST',
          body: body.toBinary(),
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            return PollResponse.fromBinary(new Uint8Array(buf)).toJson();
          },
        };
      },
      invalidatesTags: (result, error, { pollId }) => [
        { type: 'Count', id: pollId },
        { type: 'Selected', id: pollId },
        { type: 'PollDetails', id: pollId },
      ],
    }),
    closePoll: builder.mutation<PollResponse, ClosePollReq>({
      query(body) {
        return {
          url: 'closePoll',
          method: 'POST',
          body: body.toBinary(),
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            return PollResponse.fromBinary(new Uint8Array(buf)).toJson();
          },
        };
      },
      invalidatesTags: ['List', 'PollsStats'],
    }),
  }),
});

export const {
  useGetPollListsQuery,
  useGetCountTotalResponsesQuery,
  useGetUserSelectedOptionQuery,
  useGetPollResponsesDetailsQuery,
  useCreatePollMutation,
  useAddResponseMutation,
  useClosePollMutation,
  useGetPollResponsesResultQuery,
  useGetPollsStatsQuery,
} = pollsApi;
