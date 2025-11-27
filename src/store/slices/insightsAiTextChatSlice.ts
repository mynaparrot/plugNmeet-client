import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { InsightsAITextChatStreamResult } from 'plugnmeet-protocol-js';

export interface IInsightsAITextChatMessage {
  id: string;
  role: 'user' | 'model';
  createdAt: string;
  parts: string[];
}

interface IInsightsAiTextChatState {
  finalMessages: IInsightsAITextChatMessage[];
  interimMessage: IInsightsAITextChatMessage | null;
}

const initialState: IInsightsAiTextChatState = {
  finalMessages: [],
  interimMessage: null,
};

const insightsAiTextChatSlice = createSlice({
  name: 'insightsAiTextChat',
  initialState,
  reducers: {
    addAiTextChatUserMessage: (state, action: PayloadAction<string>) => {
      const id = Date.now().toString();
      state.finalMessages.push({
        id: id,
        role: 'user',
        createdAt: id,
        parts: [action.payload],
      });
    },
    // This single action handles all streaming logic.
    updateAiTextChat: (
      state,
      action: PayloadAction<InsightsAITextChatStreamResult>,
    ) => {
      const { id, text, isLastChunk, createdAt } = action.payload;

      if (text) {
        if (!state.interimMessage || state.interimMessage.id !== id) {
          state.interimMessage = {
            id: id,
            role: 'model',
            parts: [text],
            createdAt: createdAt,
          };
        } else {
          state.interimMessage.parts.push(text);
        }
      }

      // If this is the last chunk, finalize the message.
      if (isLastChunk) {
        if (state.interimMessage && state.interimMessage.id === id) {
          state.finalMessages.push(state.interimMessage);
          state.interimMessage = null;
        }
      }
    },
  },
});

export const { addAiTextChatUserMessage, updateAiTextChat } =
  insightsAiTextChatSlice.actions;

export default insightsAiTextChatSlice.reducer;
