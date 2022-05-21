export interface CreatePoll {
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

export interface PollLists {
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

export interface TotalResponses {
  status: boolean;
  msg: string;
  poll_id?: string;
  total_responses?: number;
}

export interface UserSelectedOption {
  status: boolean;
  msg: string;
  poll_id?: string;
  voted?: number;
}

export interface PollResponses {
  status: boolean;
  msg: string;
  poll_id?: string;
  responses?: any;
}

export interface SubmitResponse {
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
