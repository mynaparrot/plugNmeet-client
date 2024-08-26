import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { RootState } from '..';
import { ChatMessage } from 'plugnmeet-protocol-js';

const chatMessagesAdapter = createEntityAdapter({
  selectId: (chatMessage: ChatMessage) => chatMessage.id,
  sortComparer: (a: ChatMessage, b: ChatMessage) => {
    const aTime = new Date(a.sentAt);
    const bTime = new Date(b.sentAt);
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
