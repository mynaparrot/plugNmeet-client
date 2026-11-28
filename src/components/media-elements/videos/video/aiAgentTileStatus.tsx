import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { useAppSelector } from '../../../../store';
import { aiAgentSelector } from '../../../../store/slices/aiAgentSlice';
import { activeSpeakersSelector } from '../../../../store/slices/activeSpeakersSlice';
import { isAIAgentUserId } from '../../../insights-ai/ai-agent/constants';
import {
  AIAgentStatusTone,
  getAIAgentDisplayStatusText,
  getAIAgentStatusLabel,
  isAIAgentRunning,
  resolveAIAgentEffectiveState,
} from '../../../insights-ai/ai-agent/ui/statusModel';

const TONE_DOT_CLASSES: Record<AIAgentStatusTone, string> = {
  speaking: 'bg-Green-500 animate-pulse',
  busy: 'bg-Blue animate-pulse',
  active: 'bg-Green-500',
  paused: 'bg-Red-400',
  idle: 'bg-Gray-400',
};

/** Live AI agent state on the agent's own avatar tile. */
const AIAgentTileStatus = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const agent = useAppSelector(aiAgentSelector);
  const isAgentAudioActive = useAppSelector((state) =>
    agent?.agentUserId
      ? !!activeSpeakersSelector.selectById(state, agent.agentUserId)?.isSpeaking
      : false,
  );

  if (!agent || !isAIAgentRunning(agent) || !isAIAgentUserId(userId, agent.agentUserId)) {
    return null;
  }

  const effectiveState = resolveAIAgentEffectiveState(agent, isAgentAudioActive);
  const status = getAIAgentStatusLabel(effectiveState);

  return (
    <div className="absolute top-3 start-3 z-30 pointer-events-none px-2.5 py-1 rounded-full bg-Gray-950/65 backdrop-blur-xs text-white text-xs font-medium shadow-shadowXS inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={clsx('w-1.5 h-1.5 rounded-full shrink-0', TONE_DOT_CLASSES[status.tone])}
      />
      <span className="max-w-32 truncate">
        {getAIAgentDisplayStatusText(effectiveState, t(status.key), agent.toolInProgress)}
      </span>
    </div>
  );
};

export default AIAgentTileStatus;
