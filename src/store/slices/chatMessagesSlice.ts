import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from 'plugnmeet-protocol-js';

import { RootState } from '..';

interface ChatMessagesState {
  messages: {
    [key: string]: ChatMessage[]; // key: 'public' or userId
  };
  messageIds: {
    [messageId: string]: string; // messageId: key
  };
}

const initialState: ChatMessagesState = {
  messages: {
    public: [],
  },
  messageIds: {},
};

const getChatKey = (message: ChatMessage, currentUserId: string): string => {
  if (!message.isPrivate) {
    return 'public';
  }

  if (message.fromUserId === currentUserId) {
    return message.toUserId!;
  } else {
    return message.fromUserId!;
  }
};

// Helper to ensure correct chronological sorting based on string timestamps
const sortMessages = (a: ChatMessage, b: ChatMessage) => {
  return Number(a.sentAt) - Number(b.sentAt);
};

const chatMessagesSlice = createSlice({
  name: 'chat-messages',
  initialState,
  reducers: {
    addChatMessage: (
      state,
      action: PayloadAction<{
        message: ChatMessage;
        currentUserId: string;
      }>,
    ) => {
      const { message, currentUserId } = action.payload;

      if (state.messageIds[message.id]) {
        return;
      }

      const key = getChatKey(message, currentUserId);
      if (!state.messages[key]) {
        state.messages[key] = [];
      }

      state.messages[key].push(message);
      state.messageIds[message.id] = key;
      state.messages[key].sort(sortMessages);
    },
    addAllChatMessages: (
      state,
      action: PayloadAction<{
        messages: ChatMessage[];
        currentUserId: string;
      }>,
    ) => {
      const { messages, currentUserId } = action.payload;
      const newMessagesByKey: { [key: string]: ChatMessage[] } = {};

      // 1. Group all new messages by key, filtering out duplicates
      messages.forEach((message) => {
        if (state.messageIds[message.id]) {
          return;
        }
        const key = getChatKey(message, currentUserId);
        if (!newMessagesByKey[key]) {
          newMessagesByKey[key] = [];
        }
        newMessagesByKey[key].push(message);
      });

      // 2. Merge, update IDs, and sort for each key that has new messages
      Object.keys(newMessagesByKey).forEach((key) => {
        const newMessages = newMessagesByKey[key];
        if (!state.messages[key]) {
          state.messages[key] = [];
        }

        state.messages[key].push(...newMessages);
        newMessages.forEach((msg) => {
          state.messageIds[msg.id] = key;
        });
        state.messages[key].sort(sortMessages);
      });
    },
  },
});

// Selectors
const chatMessagesStateSelector = (state: RootState) => state.chatMessages;

/**
 * Selects all the keys (e.g., 'public' or user IDs) from the chat messages state.
 * This can be used to dynamically create chat tabs.
 */
export const selectChatKeys = createSelector(
  [chatMessagesStateSelector],
  (chatMessages) => Object.keys(chatMessages.messages),
);

/**
 * Selects chat messages for a specific key (e.g., 'public' or a user ID).
 * @param state - The root state.
 * @param key - The key to retrieve messages for.
 * @returns An array of chat messages, or an empty array if no messages exist for the key.
 */
export const selectMessagesByKeyValue = createSelector(
  [chatMessagesStateSelector, (state: RootState, key: string) => key],
  (chatMessages, key) => chatMessages.messages[key] ?? [],
);

/**
 * Selects only the public chat messages.
 */
export const selectPublicChatMessages = createSelector(
  [chatMessagesStateSelector],
  (chatMessages) => chatMessages.messages['public'] ?? [],
);

export default chatMessagesSlice.reducer;
export const { addChatMessage, addAllChatMessages } = chatMessagesSlice.actions;
