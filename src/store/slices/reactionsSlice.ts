import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { RootState } from '..';

export const REACTION_TTL_MS = 4000;

export const REACTION_EMOJIS: string[] = [
  '👍',
  '❤️',
  '😂',
  '🎉',
  '👏',
  '🙌',
  '😯',
];

export interface IReaction {
  id: string;
  emoji: string;
  fromUserId: string;
  createdAt: number;
}

const reactionAdapter = createEntityAdapter({
  selectId: (reaction: IReaction) => reaction.id,
  sortComparer: (a: IReaction, b: IReaction) => a.createdAt - b.createdAt,
});

const reactionsSlice = createSlice({
  name: 'reactions',
  initialState: reactionAdapter.getInitialState(),
  reducers: {
    addReaction: reactionAdapter.addOne,
    removeReaction: reactionAdapter.removeOne,
  },
});

const reactionsSelector = reactionAdapter.getSelectors(
  (state: RootState) => state.reactions,
);

export const { addReaction, removeReaction } = reactionsSlice.actions;
export default reactionsSlice.reducer;

export const selectAllReactions = reactionsSelector.selectAll;
