import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from 'plugnmeet-protocol-js';

import { RootState } from '..';

export const WELCOME_MESSAGE_ID = 'system:welcome';

interface ChatMessagesState {
  messages: {
    [key: string]: ChatMessage[]; // key: 'public' or userId
  };
  messageIds: {
    [messageId: string]: string; // messageId: key
  };
  displayOrder: {
    [messageId: string]: number;
  };
  nextDisplayOrder: number;
}

const createInitialState = (): ChatMessagesState => ({
  messages: {
    public: [],
  },
  messageIds: {},
  displayOrder: {},
  nextDisplayOrder: 0,
});

const initialState = createInitialState();

const getChatKey = (message: ChatMessage, currentUserId: string): string => {
  if (!message.isPrivate) {
    return 'public';
  }

  return message.fromUserId === currentUserId
    ? message.toUserId!
    : message.fromUserId!;
};

const isWelcomeMessage = (message: ChatMessage): boolean => {
  return message.id === WELCOME_MESSAGE_ID;
};

const getSentAtValue = (message: ChatMessage, upperBound: number): number => {
  const sentAt = Number(message.sentAt);

  if (!Number.isFinite(sentAt)) {
    return 0;
  }

  return sentAt > upperBound ? upperBound : sentAt;
};

const sortBySentAt =
  (upperBound: number) =>
  (a: ChatMessage, b: ChatMessage): number => {
    const sentAtDiff =
      getSentAtValue(a, upperBound) - getSentAtValue(b, upperBound);

    if (sentAtDiff !== 0) {
      return sentAtDiff;
    }

    return a.id.localeCompare(b.id);
  };

const sortByDisplayOrder = (
  messages: ChatMessage[],
  displayOrder: ChatMessagesState['displayOrder'],
): void => {
  messages.sort((a, b) => {
    if (isWelcomeMessage(a)) {
      return -1;
    }

    if (isWelcomeMessage(b)) {
      return 1;
    }

    const orderA = displayOrder[a.id] ?? Number.MAX_SAFE_INTEGER;
    const orderB = displayOrder[b.id] ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.id.localeCompare(b.id);
  });
};

const getLowestDisplayOrder = (
  messages: ChatMessage[],
  displayOrder: ChatMessagesState['displayOrder'],
): number => {
  if (messages.length === 0) {
    return 0;
  }

  const firstMessage =
    isWelcomeMessage(messages[0]) && messages.length > 1
      ? messages[1]
      : messages[0];

  return displayOrder[firstMessage.id] ?? 0;
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

      state.messageIds[message.id] = key;

      if (isWelcomeMessage(message)) {
        state.displayOrder[message.id] =
          getLowestDisplayOrder(state.messages[key], state.displayOrder) - 1;
      } else {
        state.displayOrder[message.id] = state.nextDisplayOrder++;
      }

      state.messages[key].push(message);
      sortByDisplayOrder(state.messages[key], state.displayOrder);
    },

    addAllChatMessages: {
      prepare: (payload: {
        messages: ChatMessage[];
        currentUserId: string;
      }) => ({
        payload,
        meta: {
          timestamp: Date.now(),
        },
      }),

      reducer: (
        state,
        action: PayloadAction<
          {
            messages: ChatMessage[];
            currentUserId: string;
          },
          string,
          {
            timestamp: number;
          }
        >,
      ) => {
        const { messages, currentUserId } = action.payload;
        const affectedKeys = new Set<string>();
        const lowestOrderByKey: { [key: string]: number } = {};

        const sortedMessages = [...messages].sort(
          sortBySentAt(action.meta.timestamp),
        );
        const messagesToAdd = [...sortedMessages].reverse();

        messagesToAdd.forEach((message) => {
          if (state.messageIds[message.id]) {
            return;
          }

          const key = getChatKey(message, currentUserId);

          if (!state.messages[key]) {
            state.messages[key] = [];
          }

          if (lowestOrderByKey[key] === undefined) {
            lowestOrderByKey[key] = getLowestDisplayOrder(
              state.messages[key],
              state.displayOrder,
            );
          }

          state.messageIds[message.id] = key;

          if (isWelcomeMessage(message)) {
            state.displayOrder[message.id] = --lowestOrderByKey[key];
          } else {
            state.displayOrder[message.id] = --lowestOrderByKey[key];
          }

          state.messages[key].push(message);
          affectedKeys.add(key);
        });

        affectedKeys.forEach((key) => {
          sortByDisplayOrder(state.messages[key], state.displayOrder);
        });
      },
    },

    resetChatMessages: () => createInitialState(),
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
  [chatMessagesStateSelector, (_state: RootState, key: string) => key],
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

export const { addChatMessage, addAllChatMessages, resetChatMessages } =
  chatMessagesSlice.actions;
