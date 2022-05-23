import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  ClosePollReq,
  ClosePollRes,
  CreatePollReq,
  CreatePollRes,
  PollListsRes,
  PollResponsesRes,
  PollResponsesResultRes,
  PollsStatsRes,
  SubmitResponseReq,
  SubmitResponseRes,
  TotalResponsesRes,
  UserSelectedOptionRes,
} from './pollsApiTypes';

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
    getPollLists: builder.query<PollListsRes, void>({
      query: () => `listPolls`,
      providesTags: ['List'],
    }),
    getCountTotalResponses: builder.query<TotalResponsesRes, string>({
      query: (poll_id) => `countTotalResponses/${poll_id}`,
      providesTags: (result) => {
        return (result as any).status
          ? ['Count', { type: 'Count' as const, id: (result as any).poll_id }]
          : ['Count'];
      },
    }),
    getUserSelectedOption: builder.query<
      UserSelectedOptionRes,
      { pollId: string; userId: string }
    >({
      query: ({ pollId, userId }) => `userSelectedOption/${pollId}/${userId}`,
      providesTags: (result) => {
        return result?.status
          ? ['Selected', { type: 'Selected' as const, id: result.poll_id }]
          : ['Selected'];
      },
    }),
    getPollResponsesDetails: builder.query<PollResponsesRes, string>({
      query: (poll_id) => `pollResponsesDetails/${poll_id}`,
      providesTags: (result) => {
        return result?.status
          ? [
              'PollDetails',
              { type: 'PollDetails' as const, id: result.poll_id },
            ]
          : ['PollDetails'];
      },
    }),
    getPollResponsesResult: builder.query<PollResponsesResultRes, string>({
      query: (poll_id) => `pollResponsesResult/${poll_id}`,
      providesTags: (result) => {
        return result?.status
          ? ['PollResult', { type: 'PollResult' as const, id: result.poll_id }]
          : ['PollResult'];
      },
    }),
    getPollsStats: builder.query<PollsStatsRes, void>({
      query: () => 'pollsStats',
      providesTags: ['PollsStats'],
    }),
    createPoll: builder.mutation<CreatePollRes, CreatePollReq>({
      query(body) {
        return {
          url: 'create',
          method: 'POST',
          body,
        };
      },
      invalidatesTags: ['List', 'PollsStats'],
    }),
    addResponse: builder.mutation<SubmitResponseRes, SubmitResponseReq>({
      query(body) {
        return {
          url: 'submitResponse',
          method: 'POST',
          body,
        };
      },
      invalidatesTags: (result, error, { poll_id }) => [
        { type: 'Count', id: poll_id },
        { type: 'Selected', id: poll_id },
        { type: 'PollDetails', id: poll_id },
      ],
    }),
    closePoll: builder.mutation<ClosePollRes, ClosePollReq>({
      query(body) {
        return {
          url: 'closePoll',
          method: 'POST',
          body,
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
