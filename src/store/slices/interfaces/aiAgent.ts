import type { AIAgentRuntimeState } from 'plugnmeet-protocol-js';

/** Latest AI agent state pushed by the server (AIAgentStateMsg). */
export interface IAIAgentState {
  sessionId: string;
  agentUserId: string;
  agentName: string;
  state: AIAgentRuntimeState;
  isSpeaking: boolean;
  toolInProgress: string;
  // unix timestamp as sent by the server
  startedAt: number;
  reason: string;
  traceId: string;
}

export interface IAIAgentSlice {
  // null means no agent session is running in this room
  agent: IAIAgentState | null;
  // local only: the participant muted the agent's audio in this tab
  isLocalAudioMuted: boolean;
}
