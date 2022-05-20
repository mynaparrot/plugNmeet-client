export interface PollLists {
  polls: PollListItem[];
}

export interface PollListItem {
  id: string;
  question: string;
  total_responses: number;
  is_published: boolean;
  voted: boolean;
}
