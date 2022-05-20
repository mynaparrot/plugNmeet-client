import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

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
    getPollLists: builder.query<void, void>({
      query: () => `listPolls`,
      providesTags: ['List'],
    }),
    getCountTotalResponses: builder.query<void, string>({
      query: (poll_id) => `countTotalResponses/${poll_id}`,
      providesTags: (result) => {
        return (result as any).status
          ? ['Count', { type: 'Count' as const, id: (result as any).poll_id }]
          : ['Count'];
      },
    }),
    getUserSelectedOption: builder.query<
      void,
      { pollId: string; userId: string }
    >({
      query: ({ pollId, userId }) => `userSelectedOption/${pollId}/${userId}`,
      providesTags: (result) => {
        return (result as any).status
          ? [
              'Selected',
              { type: 'Selected' as const, id: (result as any).poll_id },
            ]
          : ['Selected'];
      },
    }),
    getPollResponses: builder.query<void, string>({
      query: (poll_id) => `pollResponses/${poll_id}`,
      providesTags: (result) => {
        return (result as any).status
          ? ['Single', { type: 'Single' as const, id: (result as any).poll_id }]
          : ['Single'];
      },
    }),
  }),
});

export const {
  useGetPollListsQuery,
  useGetCountTotalResponsesQuery,
  useGetUserSelectedOptionQuery,
  useGetPollResponsesQuery,
} = pollsApi;
