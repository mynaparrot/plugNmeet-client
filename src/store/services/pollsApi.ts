import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { fromBinary, toBinary, toJson } from '@bufbuild/protobuf';
import {
  PollResponse,
  CreatePollReq,
  SubmitPollResponseReq,
  ClosePollReq,
  PollResponseSchema,
  CreatePollReqSchema,
  SubmitPollResponseReqSchema,
  ClosePollReqSchema,
} from 'plugnmeet-protocol-js';

import { renewTokenOnError } from './utils';

export const pollsApi = createApi({
  reducerPath: 'pollsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: (window as any).PLUG_N_MEET_SERVER_URL + '/api/polls',
    prepareHeaders: (headers, api) => {
      // @ts-expect-error not an error
      const token = api.getState().session.token;
      headers.append('Authorization', token);
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
            const b = fromBinary(PollResponseSchema, new Uint8Array(buf));
            return toJson(PollResponseSchema, b);
          },
        };
      },
      transformErrorResponse: renewTokenOnError,
      providesTags: ['List'],
    }),
    getCountTotalResponses: builder.query<PollResponse, string>({
      query: (poll_id) => {
        return {
          url: `countTotalResponses/${poll_id}`,
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            const b = fromBinary(PollResponseSchema, new Uint8Array(buf));
            return toJson(PollResponseSchema, b);
          },
        };
      },
      transformErrorResponse: renewTokenOnError,
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
            const b = fromBinary(PollResponseSchema, new Uint8Array(buf));
            return toJson(PollResponseSchema, b);
          },
        };
      },
      transformErrorResponse: renewTokenOnError,
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
            const b = fromBinary(PollResponseSchema, new Uint8Array(buf));
            return toJson(PollResponseSchema, b);
          },
        };
      },
      transformErrorResponse: renewTokenOnError,
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
            const b = fromBinary(PollResponseSchema, new Uint8Array(buf));
            return toJson(PollResponseSchema, b);
          },
        };
      },
      transformErrorResponse: renewTokenOnError,
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
            const b = fromBinary(PollResponseSchema, new Uint8Array(buf));
            return toJson(PollResponseSchema, b);
          },
        };
      },
      transformErrorResponse: renewTokenOnError,
      providesTags: ['PollsStats'],
    }),
    createPoll: builder.mutation<PollResponse, CreatePollReq>({
      query(body) {
        return {
          url: 'create',
          method: 'POST',
          body: toBinary(CreatePollReqSchema, body),
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            const b = fromBinary(PollResponseSchema, new Uint8Array(buf));
            return toJson(PollResponseSchema, b);
          },
        };
      },
      transformErrorResponse: renewTokenOnError,
      invalidatesTags: ['List', 'PollsStats'],
    }),
    addResponse: builder.mutation<PollResponse, SubmitPollResponseReq>({
      query(body) {
        return {
          url: 'submitResponse',
          method: 'POST',
          body: toBinary(SubmitPollResponseReqSchema, body),
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            const b = fromBinary(PollResponseSchema, new Uint8Array(buf));
            return toJson(PollResponseSchema, b);
          },
        };
      },
      transformErrorResponse: renewTokenOnError,
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
          body: toBinary(ClosePollReqSchema, body),
          responseHandler: async (res) => {
            const buf = await res.arrayBuffer();
            const b = fromBinary(PollResponseSchema, new Uint8Array(buf));
            return toJson(PollResponseSchema, b);
          },
        };
      },
      transformErrorResponse: renewTokenOnError,
      invalidatesTags: ['List', 'PollsStats', 'PollDetails', 'PollResult'],
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
