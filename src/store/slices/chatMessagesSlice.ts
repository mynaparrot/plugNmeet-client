import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { RootState } from '..';
import { IChatMsg } from './interfaces/dataMessages';

const chatMessagesAdapter = createEntityAdapter<IChatMsg>({
  selectId: (chatMessage) => chatMessage.message_id,
  sortComparer: (a, b) => {
    const aTime = new Date(a.time);
    const bTime = new Date(b.time);
    if (aTime.getTime() > bTime.getTime()) return 1;
    else if (aTime.getTime() < bTime.getTime()) return -1;
    else return 0;
  },
});

export const chatMessagesSelector = chatMessagesAdapter.getSelectors(
  (state: RootState) => state.chatMessages,
);

const chatMessagesSlice = createSlice({
  name: 'chat-messages',
  initialState: chatMessagesAdapter.getInitialState(),
  reducers: {
    addChatMessage: chatMessagesAdapter.addOne,
    removeChatMessage: chatMessagesAdapter.removeOne,
    updateChatMessage: chatMessagesAdapter.updateOne,
  },
});

export const { addChatMessage, removeChatMessage, updateChatMessage } =
  chatMessagesSlice.actions;
export default chatMessagesSlice.reducer;
