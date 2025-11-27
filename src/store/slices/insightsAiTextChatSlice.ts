import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IInsightsAITextChatMessage {
  id: string;
  role: 'user' | 'model';
  parts: string[];
}

interface IInsightsAiTextChatState {
  // Holds the permanent, completed messages
  finalMessages: IInsightsAITextChatMessage[];
  // Holds only the message that is currently being streamed
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
    // Add the user's own prompt directly to the final list
    addInsightsUserMessage: (state, action: PayloadAction<string>) => {
      state.finalMessages.push({
        id: Date.now().toString(),
        role: 'user',
        parts: [action.payload],
      });
    },
    // When the first chunk of an AI response arrives, create the interim message
    startStreamingInsightsAIResponse: (
      state,
      action: PayloadAction<{ id: string; firstChunk: string }>,
    ) => {
      state.interimMessage = {
        id: action.payload.id,
        role: 'model',
        parts: [action.payload.firstChunk],
      };
    },
    // For all subsequent chunks, ONLY update the interim message
    appendChunkToInsightsAIResponse: (
      state,
      action: PayloadAction<{ chunk: string }>,
    ) => {
      if (state.interimMessage) {
        state.interimMessage.parts.push(action.payload.chunk);
      }
    },
    // When the stream is finished, move the interim message to the final list
    endStreamingInsightsAIResponse: (state) => {
      if (state.interimMessage) {
        state.finalMessages.push(state.interimMessage);
        state.interimMessage = null;
      }
    },
  },
});

export const {
  addInsightsUserMessage,
  startStreamingInsightsAIResponse,
  appendChunkToInsightsAIResponse,
  endStreamingInsightsAIResponse,
} = insightsAiTextChatSlice.actions;

export default insightsAiTextChatSlice.reducer;
