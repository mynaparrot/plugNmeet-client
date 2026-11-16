import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '../index';
import type { IAIAgentSlice, IAIAgentState } from './interfaces/aiAgent';

const initialState: IAIAgentSlice = {
  agent: null,
  isLocalAudioMuted: false,
};

const aiAgentSlice = createSlice({
  name: 'ai-agent',
  initialState,
  reducers: {
    setAIAgentState: (state, action: PayloadAction<IAIAgentState>) => {
      state.agent = action.payload;
    },
    setAIAgentLocalMuted: (state, action: PayloadAction<boolean>) => {
      state.isLocalAudioMuted = action.payload;
    },
    resetAIAgentState: (state) => {
      state.agent = null;
      state.isLocalAudioMuted = false;
    },
  },
});

export const { setAIAgentState, setAIAgentLocalMuted, resetAIAgentState } = aiAgentSlice.actions;
export default aiAgentSlice.reducer;

const aiAgentStateSelector = (state: RootState) => state.aiAgent;

export const aiAgentSelector = createSelector([aiAgentStateSelector], (aiAgent) => aiAgent.agent);

export const isAIAgentActiveSelector = createSelector([aiAgentSelector], (agent) => agent !== null);

export const isAIAgentSpeakingSelector = createSelector(
  [aiAgentSelector],
  (agent) => agent?.isSpeaking === true,
);

export const isAIAgentLocalMutedSelector = createSelector(
  [aiAgentStateSelector],
  (aiAgent) => aiAgent.isLocalAudioMuted,
);
