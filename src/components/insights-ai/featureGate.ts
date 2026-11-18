import type { AIAgentAutoSessionConfig, AIAgentSessionMode } from 'plugnmeet-protocol-js';

import type { RootState } from '../../store';
import type { IRoomMetadata } from '../../store/slices/interfaces/session';
import {
  getAIAgentAllowedParticipantIds,
  getAIAgentMaxConcurrentSessions,
  isAIAgentAutoStart,
  isAIAgentSessionRoom,
  isAutoPerUserAISessionRoom,
} from '../../helpers/aiAgentSession';

export {
  getAIAgentAllowedParticipantIds,
  getAIAgentMaxConcurrentSessions,
  isAIAgentAutoStart,
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

/** The AI Agent owns the chat box only inside its own session room. */
export const isAIAgentChatEnabled = (metadata?: IRoomMetadata): boolean =>
  isAIAgentSessionRoom(metadata) && aiAgentFeaturesOf(metadata)?.allowChatMessage !== false;

/** The AI Chat box is enabled by the standalone feature or by the AI Agent. */
export const isInsightsAiTextChatEnabled = (metadata?: IRoomMetadata): boolean =>
  metadata?.roomFeatures?.insightsFeatures?.aiFeatures?.aiTextChatFeatures?.isEnabled === true ||
  isAIAgentChatEnabled(metadata);

export const selectIsAIAgentChatEnabled = (state: RootState): boolean =>
  isAIAgentChatEnabled(selectRoomMetadata(state));

export const selectIsInsightsAiTextChatEnabled = (state: RootState): boolean =>
  isInsightsAiTextChatEnabled(selectRoomMetadata(state));

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
