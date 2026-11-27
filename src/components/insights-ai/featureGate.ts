import type { AIAgentAutoSessionConfig, AIAgentSessionMode } from 'plugnmeet-protocol-js';

import type { RootState } from '../../store';
import type { IRoomMetadata } from '../../store/slices/interfaces/session';
import {
  getAIAgentAllowedParticipantIds,
  getAIAgentMaxConcurrentSessions,
  isAIAgentAutoStart,
  isAIAgentSessionObserver,
  isAIAgentSessionRoom,
  isAutoPerUserAISessionRoom,
} from '../../helpers/aiAgentSession';

export {
  getAIAgentAllowedParticipantIds,
  getAIAgentMaxConcurrentSessions,
  isAIAgentAutoStart,
  isAIAgentSessionObserver,
  isAIAgentSessionRoom,
  isAutoPerUserAISessionRoom,
};

export interface IAIAgentFeatureFlags {
  isAllow?: boolean;
  allowChatMessage?: boolean;
  agentDisplayName?: string;
  sessionMode?: AIAgentSessionMode;
  autoSessionConfig?: AIAgentAutoSessionConfig;
}

const selectRoomMetadata = (state: RootState): IRoomMetadata | undefined =>
  state.session.currentRoom?.metadata;

const aiAgentFeaturesOf = (metadata?: IRoomMetadata): IAIAgentFeatureFlags | undefined =>
  metadata?.roomFeatures?.insightsFeatures?.aiAgentFeatures;

const selectCurrentUserId = (state: RootState): string | undefined =>
  state.session.currentUser?.userId;

/** The AI Agent owns the chat box inside its own session room, but observers keep to public chat. */
export const isAIAgentChatEnabled = (metadata?: IRoomMetadata, userId?: string): boolean =>
  isAIAgentSessionRoom(metadata) &&
  !isAIAgentSessionObserver(metadata, userId) &&
  aiAgentFeaturesOf(metadata)?.allowChatMessage !== false;

/** The AI Chat box is enabled by the standalone feature or by the AI Agent. */
export const isInsightsAiTextChatEnabled = (metadata?: IRoomMetadata, userId?: string): boolean =>
  (!isAIAgentSessionRoom(metadata) &&
    metadata?.roomFeatures?.insightsFeatures?.aiFeatures?.aiTextChatFeatures?.isEnabled === true) ||
  isAIAgentChatEnabled(metadata, userId);

export const selectIsAIAgentChatEnabled = (state: RootState): boolean =>
  isAIAgentChatEnabled(selectRoomMetadata(state), selectCurrentUserId(state));

export const selectIsInsightsAiTextChatEnabled = (state: RootState): boolean =>
  isInsightsAiTextChatEnabled(selectRoomMetadata(state), selectCurrentUserId(state));

export const selectInsightsAIAgentFeatures = (state: RootState): IAIAgentFeatureFlags | undefined =>
  aiAgentFeaturesOf(selectRoomMetadata(state));

/** Whether the AI settings modal still has a tab left to configure. */
export const hasInsightsAiSettingsTabs = (metadata?: IRoomMetadata): boolean => {
  const insights = metadata?.roomFeatures?.insightsFeatures;
  const aiFeatures = insights?.aiFeatures;
  if (insights?.isAllow !== true || aiFeatures?.isAllow !== true) {
    return false;
  }
  const standaloneChat =
    aiFeatures.aiTextChatFeatures?.isAllow === true && !isAIAgentSessionRoom(metadata);
  return standaloneChat || aiFeatures.meetingSummarizationFeatures?.isAllow === true;
};
