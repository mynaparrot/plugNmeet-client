import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  CreatePoll,
  CreatePollRes,
  PollLists,
  PollResponses,
  SubmitResponse,
  SubmitResponseRes,
  TotalResponses,
  UserSelectedOption,
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
  tagTypes: ['List', 'Count', 'Selected', 'Single'],
  endpoints: (builder) => ({
    getPollLists: builder.query<PollLists, void>({
      query: () => `listPolls`,
      providesTags: ['List'],
    }),
    getCountTotalResponses: builder.query<TotalResponses, string>({
      query: (poll_id) => `countTotalResponses/${poll_id}`,
      providesTags: (result) => {
        return (result as any).status
          ? ['Count', { type: 'Count' as const, id: (result as any).poll_id }]
          : ['Count'];
      },
    }),
    getUserSelectedOption: builder.query<
      UserSelectedOption,
      { pollId: string; userId: string }
    >({
      query: ({ pollId, userId }) => `userSelectedOption/${pollId}/${userId}`,
      providesTags: (result) => {
        return result?.status
          ? ['Selected', { type: 'Selected' as const, id: result.poll_id }]
          : ['Selected'];
      },
    }),
    getPollResponses: builder.query<PollResponses, string>({
      query: (poll_id) => `pollResponses/${poll_id}`,
      providesTags: (result) => {
        return result?.status
          ? ['Single', { type: 'Single' as const, id: result.poll_id }]
          : ['Single'];
      },
    }),
    createPoll: builder.mutation<CreatePollRes, CreatePoll>({
      query(body) {
        return {
          url: 'create',
          method: 'POST',
          body,
        };
      },
      invalidatesTags: ['List'],
    }),
    addResponse: builder.mutation<SubmitResponseRes, SubmitResponse>({
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
      ],
    }),
  }),
});

export const {
  useGetPollListsQuery,
  useGetCountTotalResponsesQuery,
  useGetUserSelectedOptionQuery,
  useGetPollResponsesQuery,
  useCreatePollMutation,
  useAddResponseMutation,
} = pollsApi;
