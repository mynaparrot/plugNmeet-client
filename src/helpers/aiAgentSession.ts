import { AIAgentSessionMode } from 'plugnmeet-protocol-js';

import type { RootState } from '../store';
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
 * open-per-user mode, or a controlled room with at least one allowed user. The
 * 1-on-1 session rooms themselves route nobody, so they are never such a room.
 */
export const isAutoPerUserAISessionRoom = (metadata?: IRoomMetadata): boolean => {
  const aiAgent = aiAgentOf(metadata);
  if (!aiAgent?.isAllow || metadata?.isBreakoutRoom) {
    return false;
  }
  if (aiAgent.sessionMode === AIAgentSessionMode.AI_AGENT_SESSION_MODE_OPEN_PER_USER) {
    return true;
  }
  return (
    aiAgent.sessionMode === AIAgentSessionMode.AI_AGENT_SESSION_MODE_CONTROLLED_USERS &&
    (aiAgent.autoSessionConfig?.allowedParticipantIds?.length ?? 0) > 0
  );
};

/**
 * A room where the AI agent runs its own 1-on-1 session: a breakout room that
 * allows the agent. A parent room is always a lobby of its participants, because
 * the agent only ever runs inside their own 1-on-1 room.
 *
 * Kept out of insights-ai so the whiteboard and notepad can read it without
 * depending on the insights AI UI.
 */
export const isAIAgentSessionRoom = (metadata?: IRoomMetadata): boolean =>
  !!metadata?.isBreakoutRoom && !!aiAgentOf(metadata)?.isAllow;

/**
 * Anyone in a 1-on-1 session room who is not one of its allowed participants is
 * only observing (an admin dropping in, for example), so their mic stays locked.
 */
export const isAIAgentSessionObserver = (metadata?: IRoomMetadata, userId?: string): boolean => {
  if (!isAIAgentSessionRoom(metadata) || !userId) {
    return false;
  }
  const allowed = getAIAgentAllowedParticipantIds(metadata);
  return allowed.length > 0 && !allowed.includes(userId);
};

/**
 * The whiteboard and shared notepad turn into pure automation while an AI agent
 * is around, in its own session room or in a per-user session of a normal room.
 */
export const isWorkspaceControlledByAIAgent = (state: RootState): boolean =>
  isAIAgentSessionRoom(state.session.currentRoom?.metadata) || state.aiAgent?.agent != null;
