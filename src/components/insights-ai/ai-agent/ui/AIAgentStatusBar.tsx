import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Draggable from 'react-draggable';

import { useAppDispatch, useAppSelector } from '../../../../store';
import {
  aiAgentSelector,
  isAIAgentLocalMutedSelector,
  setAIAgentLocalMuted,
} from '../../../../store/slices/aiAgentSlice';
import Tooltip from '../../../../helpers/ui/tooltip';
import { Microphone } from '../../../../assets/Icons/Microphone';
import { MicrophoneOff } from '../../../../assets/Icons/MicrophoneOff';
import { applyAIAgentState } from '../agentState';
import { getAIAgentStatus, isAIAgentLiveState } from '../api';
import { isAIAgentSessionRoom } from '../../featureGate';
import AIAgentControlPanel from './AIAgentControlPanel';
import {
  AIAgentStatusTone,
  formatAIAgentToolName,
  getAIAgentDisplayName,
  getAIAgentStatusLabel,
  isAIAgentRunning,
  shouldShowAIAgentStatusBar,
} from './statusModel';

const TONE_DOT_CLASSES: Record<AIAgentStatusTone, string> = {
  idle: 'bg-Gray-500',
  active: 'bg-Green-700 animate-pulse',
  busy: 'bg-Blue animate-pulse',
  paused: 'bg-Red-400',
};

const DRAG_HANDLE_CLASSES = 'ai-agent-drag-handle max-md:cursor-move max-md:touch-none';

/**
 * Compact room-wide AI agent status pill: live state for everyone, plus local
 * mute and the controls the current user is allowed to use.
 */
const AIAgentStatusBar = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const nodeRef = useRef<HTMLDivElement>(null);

  const screenWidth = useAppSelector((state) => state.bottomIconsActivity.screenWidth);
  const isMobile = screenWidth < 768;

  // Reactive: room metadata can gain the AI agent feature mid-session and the
  // current user's role may resolve after mount, so never freeze this at mount.
  const metadata = useAppSelector((state) => state.session.currentRoom?.metadata);
  const currentUser = useAppSelector((state) => state.session.currentUser);

  const features = metadata?.roomFeatures?.insightsFeatures?.aiAgentFeatures;
  const isSessionRoom = isAIAgentSessionRoom(metadata);
  const isModerator = !!currentUser?.metadata?.isAdmin;
  const userId = currentUser?.userId;
  const canControl =
    isModerator || (!!userId && !!features?.allowedParticipantIds?.includes(userId));
  const configuredName = features?.agentDisplayName;

  const agent = useAppSelector(aiAgentSelector);
  const isLocalMuted = useAppSelector(isAIAgentLocalMutedSelector);
  const isRunning = isAIAgentRunning(agent);

  // Late joiners never saw the state the server published before they arrived.
  useEffect(() => {
    if (!isSessionRoom || agent) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await getAIAgentStatus();
      if (!cancelled && res.status && isAIAgentLiveState(res.state)) {
        applyAIAgentState(res.state);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSessionRoom, agent]);

  if (!shouldShowAIAgentStatusBar({ isSessionRoom, isModerator, agent })) {
    return null;
  }

  const status = isRunning
    ? getAIAgentStatusLabel(agent?.state)
    : { key: 'ai-agent.state.not-started', fallback: 'Not started', tone: 'idle' as const };
  const statusLabel = t(status.key, status.fallback);
  const toolLabel = formatAIAgentToolName(agent?.toolInProgress);
  // One fixed slot keeps the bar from jumping while a tool runs.
  const displayStatus = toolLabel ? toolLabel : statusLabel;
  const muteLabel = isLocalMuted
    ? t('ai-agent.unmute-locally', 'Unmute AI Assistant for me')
    : t('ai-agent.mute-locally', 'Mute AI Assistant for me');

  const bar = (
    <div className="ai-agent-status-bar flex items-center gap-1.5 h-8 ps-2.5 pe-1 rounded-[10px] bg-Gray-50 dark:bg-Gray-800 border border-Gray-200 dark:border-Gray-700 text-xs text-Gray-950 dark:text-white">
      <span
        aria-hidden="true"
        className={clsx('w-2 h-2 rounded-full shrink-0', TONE_DOT_CLASSES[status.tone])}
      />
      <span className={clsx('w-24 truncate font-medium', DRAG_HANDLE_CLASSES)}>
        {getAIAgentDisplayName(agent, configuredName)}
      </span>
      <span
        aria-live="polite"
        title={displayStatus}
        className={clsx('w-28 truncate text-Gray-600 dark:text-Gray-300', DRAG_HANDLE_CLASSES)}
      >
        {displayStatus}
      </span>
      <Tooltip text={muteLabel} position="bottom">
        <button
          type="button"
          aria-pressed={isLocalMuted}
          aria-label={muteLabel}
          disabled={!isRunning}
          onClick={() => dispatch(setAIAgentLocalMuted(!isLocalMuted))}
          className={clsx(
            'w-6 h-6 shrink-0 flex items-center justify-center rounded-md text-Gray-700 dark:text-dark-text focus-ring',
            isRunning
              ? 'cursor-pointer hover:bg-Gray-100 dark:hover:bg-Gray-700'
              : 'opacity-40 cursor-not-allowed',
          )}
        >
          {isLocalMuted ? <MicrophoneOff classes="h-4 w-4" /> : <Microphone classes="h-4 w-4" />}
        </button>
      </Tooltip>
      {canControl && <AIAgentControlPanel isModerator={isModerator} canControl={canControl} />}
    </div>
  );

  return (
    <Draggable
      nodeRef={nodeRef}
      bounds="#main-area"
      disabled={!isMobile}
      handle=".ai-agent-drag-handle"
      allowMobileScroll={true}
    >
      <div ref={nodeRef} className="inline-block">
        {bar}
      </div>
    </Draggable>
  );
};

export default AIAgentStatusBar;
