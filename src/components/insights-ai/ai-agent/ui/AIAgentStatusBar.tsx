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
import { activeSpeakersSelector } from '../../../../store/slices/activeSpeakersSlice';
import Tooltip from '../../../../helpers/ui/tooltip';
import { Microphone } from '../../../../assets/Icons/Microphone';
import { MicrophoneOff } from '../../../../assets/Icons/MicrophoneOff';
import { AiIconSVG } from '../../../../assets/Icons/AiIconSVG';
import { applyAIAgentState } from '../agentState';
import { getAIAgentStatus, isAIAgentLiveState } from '../api';
import { getAIAgentAllowedParticipantIds, isAIAgentSessionRoom } from '../../featureGate';
import AIAgentControlPanel from './AIAgentControlPanel';
import { useAIAgentElapsedTime } from './useAIAgentElapsedTime';
import {
  AIAgentStatusTone,
  getAIAgentDisplayName,
  getAIAgentDisplayStatusText,
  getAIAgentStatusLabel,
  isAIAgentRunning,
  resolveAIAgentEffectiveState,
  shouldShowAIAgentStatusBar,
} from './statusModel';

const TONE_DOT_CLASSES: Record<AIAgentStatusTone, string> = {
  idle: 'bg-Gray-500',
  active: 'bg-Green-700',
  speaking: 'bg-Green-700 animate-pulse',
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
    isModerator || (!!userId && getAIAgentAllowedParticipantIds(metadata).includes(userId));
  const configuredName = features?.agentDisplayName;

  const agent = useAppSelector(aiAgentSelector);
  const isLocalMuted = useAppSelector(isAIAgentLocalMutedSelector);
  const isRunning = isAIAgentRunning(agent);
  const elapsedTime = useAIAgentElapsedTime(agent, isRunning);

  // The agent's audio track can outlive the "speaking" state pushed by the server.
  const agentUserId = agent?.agentUserId;
  const isAgentAudioActive = useAppSelector((state) =>
    agentUserId ? !!activeSpeakersSelector.selectById(state, agentUserId)?.isSpeaking : false,
  );

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

  if (!shouldShowAIAgentStatusBar({ isSessionRoom, canControl, agent })) {
    return null;
  }

  const effectiveState = isRunning ? resolveAIAgentEffectiveState(agent, isAgentAudioActive) : null;
  const status = effectiveState
    ? getAIAgentStatusLabel(effectiveState)
    : { key: 'ai-agent.state.not-started', tone: 'idle' as const };
  const statusLabel = t(status.key);
  const agentName = getAIAgentDisplayName(agent, configuredName);
  // One fixed slot keeps the bar from jumping while a tool runs; talking wins over the tool name.
  const displayStatus = effectiveState
    ? getAIAgentDisplayStatusText(effectiveState, statusLabel, agent?.toolInProgress)
    : statusLabel;
  const muteLabel = isLocalMuted ? t('ai-agent.unmute-locally') : t('ai-agent.mute-locally');

  const bar = (
    <div
      className={clsx(
        'ai-agent-status-bar flex items-center gap-1.5 h-8 ps-2.5 pe-1 rounded-[10px] bg-Gray-50 dark:bg-Gray-800 border border-Gray-200 dark:border-Gray-700 text-xs text-Gray-950 dark:text-white',
        DRAG_HANDLE_CLASSES,
      )}
    >
      <span
        aria-hidden="true"
        className={clsx('w-2 h-2 rounded-full shrink-0', TONE_DOT_CLASSES[status.tone])}
      />
      <Tooltip text={agentName} position="bottom">
        <span
          aria-label={agentName}
          className="w-5 h-5 rounded-md bg-Blue/10 dark:bg-Blue/20 text-Blue dark:text-white inline-flex items-center justify-center shrink-0"
        >
          <AiIconSVG classes="h-3.5 w-3.5" />
        </span>
      </Tooltip>
      <span
        aria-live="polite"
        title={displayStatus}
        className="max-w-24 sm:max-w-36 truncate text-Gray-600 dark:text-Gray-300"
      >
        {displayStatus}
      </span>
      {elapsedTime && (
        <>
          <span aria-hidden="true" className="hidden sm:inline text-Gray-400 dark:text-Gray-500">
            ·
          </span>
          <span
            dir="ltr"
            className="hidden sm:inline tabular-nums font-medium text-Gray-700 dark:text-Gray-200"
          >
            {elapsedTime}
          </span>
        </>
      )}
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
      {canControl && (
        <AIAgentControlPanel
          canControl={canControl}
          elapsedTime={elapsedTime}
          agentName={agentName}
          statusLabel={displayStatus}
        />
      )}
    </div>
  );

  return (
    <Draggable
      nodeRef={nodeRef}
      bounds="#main-area"
      disabled={!isMobile}
      handle=".ai-agent-drag-handle"
      cancel="button"
      allowMobileScroll={true}
    >
      <div ref={nodeRef} className="inline-block max-md:pointer-events-auto">
        {bar}
      </div>
    </Draggable>
  );
};

export default AIAgentStatusBar;
