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
  endpoints: (builder) => ({
    getPollLists: builder.query<void, string>({
      query: (user_id) => `listPolls/${user_id}`,
    }),
    getPollResponses: builder.query<void, string>({
      query: (poll_id) => `pollResponses/${poll_id}`,
    }),
  }),
});

export const { useGetPollListsQuery, useGetPollResponsesQuery } = pollsApi;
