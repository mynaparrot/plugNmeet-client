export interface CreatePollReq {
  question: string;
  options: CreatePollOptions[];
}

export interface CreatePollOptions {
  id: number;
  text: string;
}

export interface CreatePollRes {
  status: boolean;
  msg: string;
}

export interface PollListsRes {
  status: boolean;
  msg: string;
  polls: PollListItem[];
}

export interface PollListItem {
  id: string;
  roomId: string;
  question: string;
  options: CreatePollOptions[];
  is_running: boolean;
  created: number;
  created_by: string;
}

export interface TotalResponsesRes {
  status: boolean;
  msg: string;
  poll_id?: string;
  total_responses?: number;
}

export interface UserSelectedOptionRes {
  status: boolean;
  msg: string;
  poll_id?: string;
  voted?: number;
}

export interface PollResponsesRes {
  status: boolean;
  msg: string;
  poll_id?: string;
  responses?: any;
}

export interface SubmitResponseReq {
  poll_id: string;
  user_id: string;
  name: string;
  selected_option: number;
}

export interface SubmitResponseRes {
  status: boolean;
  msg: string;
  poll_id?: string;
}

export interface ClosePollReq {
  poll_id: string;
}

export interface ClosePollRes {
  status: boolean;
  msg: string;
  poll_id?: string;
}

export interface PollResponsesResultRes {
  status: boolean;
  msg: string;
  poll_id?: string;
  result?: PollResponsesResult;
}

export interface PollResponsesResult {
  question: string;
  total_responses: number;
  options: PollResponsesResultOptions[];
}

export interface PollResponsesResultOptions {
  id: number;
  text: string;
  vote_count: number;
}

export interface PollsStatsRes {
  status: boolean;
  msg: string;
  stats?: PollsStats;
}

export interface PollsStats {
  total_polls: number;
  total_running: number;
}
