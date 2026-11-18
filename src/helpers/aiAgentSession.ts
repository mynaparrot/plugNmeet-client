import { AIAgentSessionMode } from 'plugnmeet-protocol-js';

import type { IRoomMetadata } from '../store/slices/interfaces/session';

/** The subset of the AI agent features these helpers read. */
interface IAIAgentSessionFeatures {
  isAllow?: boolean;
  sessionMode?: AIAgentSessionMode;
  autoSessionConfig?: {
    allowedParticipantIds?: string[];
    maxConcurrentSessions?: number;
    autoStartAgent?: boolean;
  };
}

const aiAgentOf = (metadata?: IRoomMetadata): IAIAgentSessionFeatures | undefined =>
  metadata?.roomFeatures?.insightsFeatures?.aiAgentFeatures;

/** Participants allowed a 1-on-1 session in controlled-users mode. */
export const getAIAgentAllowedParticipantIds = (metadata?: IRoomMetadata): string[] => {
  const aiAgent = aiAgentOf(metadata);
  if (aiAgent?.sessionMode === AIAgentSessionMode.AI_AGENT_SESSION_MODE_CONTROLLED_USERS) {
    return aiAgent.autoSessionConfig?.allowedParticipantIds ?? [];
  }
  return [];
};

/** How many per-user sessions may run at once in open-per-user mode. */
export const getAIAgentMaxConcurrentSessions = (metadata?: IRoomMetadata): number => {
  const aiAgent = aiAgentOf(metadata);
  if (aiAgent?.sessionMode === AIAgentSessionMode.AI_AGENT_SESSION_MODE_OPEN_PER_USER) {
    return aiAgent.autoSessionConfig?.maxConcurrentSessions ?? 0;
  }
  return 0;
};

/** Whether the server starts the agent by itself (defaults to on). */
export const isAIAgentAutoStart = (metadata?: IRoomMetadata): boolean => {
  const aiAgent = aiAgentOf(metadata);
  if (
    aiAgent?.sessionMode === AIAgentSessionMode.AI_AGENT_SESSION_MODE_CONTROLLED_USERS ||
    aiAgent?.sessionMode === AIAgentSessionMode.AI_AGENT_SESSION_MODE_OPEN_PER_USER
  ) {
    return aiAgent.autoSessionConfig?.autoStartAgent !== false;
  }
  return false;
};

/**
 * A room where each participant gets their own AI session: everyone in
 * open-per-user mode, or a controlled room with more than one allowed user.
 */
export const isAutoPerUserAISessionRoom = (metadata?: IRoomMetadata): boolean => {
  const aiAgent = aiAgentOf(metadata);
  if (!aiAgent?.isAllow) {
    return false;
  }
  if (aiAgent.sessionMode === AIAgentSessionMode.AI_AGENT_SESSION_MODE_OPEN_PER_USER) {
    return true;
  }
  return (
    aiAgent.sessionMode === AIAgentSessionMode.AI_AGENT_SESSION_MODE_CONTROLLED_USERS &&
    (aiAgent.autoSessionConfig?.allowedParticipantIds?.length ?? 0) > 1
  );
};

/**
 * A room where the AI agent runs its own 1-on-1 session: every breakout room,
 * or a parent room that assigned itself a single participant.
 *
 * Kept out of insights-ai so the whiteboard and notepad can read it without
 * depending on the insights AI UI.
 */
export const isAIAgentSessionRoom = (metadata?: IRoomMetadata): boolean => {
  const aiAgent = aiAgentOf(metadata);
  if (!aiAgent?.isAllow) {
    return false;
  }
  if (metadata?.isBreakoutRoom) {
    return true;
  }
  return (
    aiAgent.sessionMode === AIAgentSessionMode.AI_AGENT_SESSION_MODE_CONTROLLED_USERS &&
    (aiAgent.autoSessionConfig?.allowedParticipantIds?.length ?? 0) === 1
  );
};
