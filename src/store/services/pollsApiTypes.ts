export interface PollLists {
  polls: PollListItem[];
}

export interface PollListItem {
  id: string;
  roomId: string;
  question: string;
  options: any;
  is_published: boolean;
  created: number;
}
