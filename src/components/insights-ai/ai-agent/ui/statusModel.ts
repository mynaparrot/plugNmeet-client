import { AIAgentRuntimeState } from 'plugnmeet-protocol-js';

import type { IAIAgentState } from '../../../../store/slices/interfaces/aiAgent';

export type AIAgentStatusTone = 'idle' | 'active' | 'busy' | 'paused';

export interface IAIAgentStatusLabel {
  key: string;
  tone: AIAgentStatusTone;
}

const STATE_LABELS: Record<AIAgentRuntimeState, IAIAgentStatusLabel> = {
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED]: {
    key: 'ai-agent.state.unknown',
    tone: 'active',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_CONNECTING]: {
    key: 'ai-agent.state.connecting',
    tone: 'active',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_LISTENING]: {
    key: 'ai-agent.state.listening',
    tone: 'active',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_THINKING]: {
    key: 'ai-agent.state.thinking',
    tone: 'busy',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING]: {
    key: 'ai-agent.state.speaking',
    tone: 'active',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_DRAWING]: {
    key: 'ai-agent.state.drawing',
    tone: 'busy',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_PAUSED]: {
    key: 'ai-agent.state.paused',
    tone: 'paused',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_RECONNECTING]: {
    key: 'ai-agent.state.reconnecting',
    tone: 'busy',
  },
  [AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED]: {
    key: 'ai-agent.state.stopped',
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

/**
 * Live "connected for" timer: `MM:SS`, switching to `HH:MM:SS` after an hour.
 * Missing or future start times read as `00:00` instead of a negative value.
 */
export const formatAIAgentElapsed = (startedAtMs?: number, nowMs: number = Date.now()): string => {
  if (!startedAtMs || startedAtMs <= 0 || nowMs < startedAtMs) {
    return '00:00';
  }
  const totalSeconds = Math.floor((nowMs - startedAtMs) / 1000);
  const pad = (value: number) => value.toString().padStart(2, '0');
  if (totalSeconds >= 3600) {
    return `${pad(Math.floor(totalSeconds / 3600))}:${pad(
      Math.floor((totalSeconds % 3600) / 60),
    )}:${pad(totalSeconds % 60)}`;
  }
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
};

export interface IStatusBarVisibility {
  isSessionRoom: boolean;
  /** A moderator or an authorized participant of a 1-on-1 session. */
  canControl: boolean;
  agent: IAIAgentState | null;
}

/**
 * The bar lives in AI session rooms only. Whoever may drive the session sees it
 * before a start so they can launch the agent, and again once the agent stops so
 * they can start it over; everyone else sees it once the agent is running.
 */
export const shouldShowAIAgentStatusBar = ({
  isSessionRoom,
  canControl,
  agent,
}: IStatusBarVisibility): boolean => {
  if (!isSessionRoom) {
    return false;
  }
  return canControl || isAIAgentRunning(agent);
};
