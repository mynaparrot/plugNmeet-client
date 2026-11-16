import { AIAgentRuntimeState } from 'plugnmeet-protocol-js';

import type { IAIAgentState } from '../../../../store/slices/interfaces/aiAgent';

export type AIAgentStatusTone = 'idle' | 'active' | 'busy' | 'paused';

export interface IAIAgentStatusLabel {
  key: string;
  fallback: string;
  tone: AIAgentStatusTone;
}

const STATE_LABELS: Record<AIAgentRuntimeState, IAIAgentStatusLabel> = {
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED]: {
    key: 'ai-agent.state.unknown',
    fallback: 'Connecting...',
    tone: 'active',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_CONNECTING]: {
    key: 'ai-agent.state.connecting',
    fallback: 'Connecting...',
    tone: 'active',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_LISTENING]: {
    key: 'ai-agent.state.listening',
    fallback: 'Listening',
    tone: 'active',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_THINKING]: {
    key: 'ai-agent.state.thinking',
    fallback: 'Thinking',
    tone: 'busy',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING]: {
    key: 'ai-agent.state.speaking',
    fallback: 'Speaking',
    tone: 'active',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_DRAWING]: {
    key: 'ai-agent.state.drawing',
    fallback: 'Drawing on board',
    tone: 'busy',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_PAUSED]: {
    key: 'ai-agent.state.paused',
    fallback: 'Paused',
    tone: 'paused',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_RECONNECTING]: {
    key: 'ai-agent.state.reconnecting',
    fallback: 'Reconnecting...',
    tone: 'busy',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED]: {
    key: 'ai-agent.state.stopped',
    fallback: 'Stopped',
    tone: 'idle',
  },
};

export const getAIAgentStatusLabel = (state?: AIAgentRuntimeState): IAIAgentStatusLabel =>
  STATE_LABELS[state ?? AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED];

/** A live session is anything except stopped/unspecified. */
export const isAIAgentRunning = (agent: IAIAgentState | null): boolean =>
  !!agent &&
  agent.state !== AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED &&
  agent.state !== AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED;

export const isAIAgentPaused = (agent: IAIAgentState | null): boolean =>
  agent?.state === AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_PAUSED;

export const getAIAgentDisplayName = (
  agent: IAIAgentState | null,
  configuredName?: string,
): string => agent?.agentName?.trim() || configuredName?.trim() || 'AI Assistant';

/** `draw_shapes` -> `draw shapes`; empty when no tool is running. */
export const formatAIAgentToolName = (tool?: string): string =>
  (tool ?? '').trim().replace(/[_-]/g, ' ');

export interface IStatusBarVisibility {
  isSessionRoom: boolean;
  isModerator: boolean;
  agent: IAIAgentState | null;
}

/**
 * The bar lives in AI session rooms only. Moderators see it before a start so
 * they can launch the agent; everyone else sees it once the agent is running,
 * which is also when their controls (pause/resume) first appear - so the pill
 * never changes width after it shows up.
 */
export const shouldShowAIAgentStatusBar = ({
  isSessionRoom,
  isModerator,
  agent,
}: IStatusBarVisibility): boolean => {
  if (!isSessionRoom) {
    return false;
  }
  return isModerator || isAIAgentRunning(agent);
};
