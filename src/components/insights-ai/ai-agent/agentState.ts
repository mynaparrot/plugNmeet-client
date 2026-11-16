import { fromJsonString } from '@bufbuild/protobuf';
import { AIAgentRuntimeState, AIAgentStateMsg, AIAgentStateMsgSchema } from 'plugnmeet-protocol-js';

import { store } from '../../../store';
import { resetAIAgentState, setAIAgentState } from '../../../store/slices/aiAgentSlice';
import { initWhiteboardVisionSync } from './whiteboard/useVisionSync';
import { initNotepadAgentSync } from './shared-notepad/notepadSync';

const isEnded = (state: AIAgentRuntimeState) =>
  state === AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED ||
  state === AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED;

/**
 * Applies a server-pushed agent state to the store. A stopped session clears
 * the slice, so `agent !== null` always means "an agent is live in this room".
 */
export const applyAIAgentState = (state: AIAgentStateMsg) => {
  if (isEnded(state.state)) {
    store.dispatch(resetAIAgentState());
    return;
  }

  store.dispatch(
    setAIAgentState({
      sessionId: state.sessionId,
      agentUserId: state.agentUserId,
      agentName: state.agentName,
      state: state.state,
      isSpeaking: state.isSpeaking,
      toolInProgress: state.toolInProgress,
      startedAt: Number(state.startedAt) || 0,
      reason: state.reason,
      traceId: state.traceId,
    }),
  );
  // A live agent session is what turns the whiteboard vision and notepad sync
  // loops on; both stay inert on their own until then.
  initWhiteboardVisionSync();
  initNotepadAgentSync();
};

export const applyAIAgentStateJson = (msg: string) => {
  if (!msg) {
    return;
  }
  applyAIAgentState(fromJsonString(AIAgentStateMsgSchema, msg));
};
