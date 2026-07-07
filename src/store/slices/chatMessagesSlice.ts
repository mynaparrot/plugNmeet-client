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
  // Client-local, monotonically increasing arrival index used as the sort key
  // instead of sentAt. sentAt is the *sender's* local clock (Date.now()), which
  // is unreliable when participants' clocks are skewed and caused messages to be
  // inserted into the middle of the history rather than appended (issue #1062).
  messageOrder: {
    [messageId: string]: number;
  };
  nextOrder: number;
}

const initialState: ChatMessagesState = {
  messages: {
    public: [],
  },
  messageIds: {},
  messageOrder: {},
  nextOrder: 0,
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

      // Assign the next arrival index. Because it strictly increases in the
      // order this client receives messages (which matches the server's relay
      // order), the new message always belongs at the end — no re-sort needed,
      // and a peer's skewed clock can no longer reorder existing messages.
      state.messageOrder[message.id] = state.nextOrder++;
      state.messageIds[message.id] = key;
      state.messages[key].push(message);
    },
    addAllChatMessages: (
      state,
      action: PayloadAction<{
        messages: ChatMessage[];
        currentUserId: string;
      }>,
    ) => {
      const { messages, currentUserId } = action.payload;

      // Bootstrap path (e.g. persisted history). Live arrival order is unknown
      // here, so seed the arrival index using sentAt as a best-effort ordering.
      // This is the ONLY place sentAt still influences ordering, and it affects
      // historical messages only — never live ones added via addChatMessage.
      const affectedKeys = new Set<string>();
      messages
        .filter((message) => !state.messageIds[message.id])
        .sort((a, b) => Number(a.sentAt) - Number(b.sentAt))
        .forEach((message) => {
          const key = getChatKey(message, currentUserId);
          if (!state.messages[key]) {
            state.messages[key] = [];
          }
          state.messageOrder[message.id] = state.nextOrder++;
          state.messageIds[message.id] = key;
          state.messages[key].push(message);
          affectedKeys.add(key);
        });

      // Keep each touched conversation ordered by the arrival index.
      affectedKeys.forEach((key) => {
        state.messages[key].sort(
          (a, b) => state.messageOrder[a.id] - state.messageOrder[b.id],
        );
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
