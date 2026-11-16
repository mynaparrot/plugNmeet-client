import type { IRoomMetadata } from '../store/slices/interfaces/session';

/**
 * A room where the AI agent runs its own 1-on-1 session: every breakout room,
 * or a parent room that assigned itself a single participant.
 *
 * Kept out of insights-ai so the whiteboard and notepad can read it without
 * depending on the insights AI UI.
 */
export const isAIAgentSessionRoom = (metadata?: IRoomMetadata): boolean => {
  const aiAgent = metadata?.roomFeatures?.insightsFeatures?.aiAgentFeatures;
  if (!aiAgent?.isAllow) {
    return false;
  }
  if (metadata?.isBreakoutRoom) {
    return true;
  }
  return !aiAgent.autoCreatePerUserSession && (aiAgent.allowedParticipantIds?.length ?? 0) === 1;
};
