import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import clsx from 'clsx';

import { useAppDispatch, useAppSelector } from '../../../../store';
import { aiAgentSelector } from '../../../../store/slices/aiAgentSlice';
import { addUserNotification } from '../../../../store/slices/roomSettingsSlice';
import { applyAIAgentState } from '../agentState';
import {
  AIAgentApiResult,
  isAIAgentLiveState,
  pauseAIAgent,
  resumeAIAgent,
  sendAIAgentContext,
  startAIAgent,
  stopAIAgent,
} from '../api';
import { isAIAgentPaused, isAIAgentRunning } from './statusModel';
import { DropdownIconSVG } from '../../../../assets/Icons/DropdownIconSVG';

const buttonClass =
  'h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

interface IAIAgentControlPanelProps {
  isModerator: boolean;
  canControl: boolean;
}

/**
 * Start/pause/resume/stop controls. Moderators get every action; a student in
 * a 1-on-1 session may only pause and resume a running agent.
 */
const AIAgentControlPanel = ({ isModerator, canControl }: IAIAgentControlPanelProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const agent = useAppSelector(aiAgentSelector);
  const isRunning = isAIAgentRunning(agent);
  const isPaused = isAIAgentPaused(agent);
  const [isBusy, setIsBusy] = useState(false);
  const [context, setContext] = useState('');

  const run = async (task: () => Promise<AIAgentApiResult>, onSuccess?: () => void) => {
    setIsBusy(true);
    try {
      const res = await task();
      if (!res.status) {
        dispatch(
          addUserNotification({
            message: t(res.msg || 'ai-agent.errors.generic', 'Something went wrong. Try again.'),
            typeOption: 'error',
          }),
        );
        return false;
      }
      if (isAIAgentLiveState(res.state)) {
        applyAIAgentState(res.state);
      }
      onSuccess?.();
      return true;
    } finally {
      setIsBusy(false);
    }
  };

  const sendContext = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = context.trim();
    if (!text) {
      return;
    }
    await run(
      () => sendAIAgentContext(text, 'moderator'),
      () => setContext(''),
    );
  };

  const showStart = isModerator && !isRunning;
  const showPauseResume = canControl && isRunning;

  if (!showStart && !showPauseResume) {
    return null;
  }

  return (
    <Popover className="relative">
      <PopoverButton
        aria-label={t('ai-agent.controls', 'AI Assistant controls')}
        className="h-6 px-1.5 flex items-center gap-0.5 rounded-md text-[11px] font-medium text-Gray-700 dark:text-dark-text hover:bg-Gray-100 dark:hover:bg-Gray-700 cursor-pointer focus-ring"
      >
        {t('ai-agent.controls-short', 'Controls')}
        <DropdownIconSVG />
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-9999 w-60 p-2.5 mt-1.5 rounded-lg bg-white dark:bg-dark-secondary2 border border-Gray-200 dark:border-Gray-700 shadow-lg transition data-[closed]:opacity-0 data-[closed]:scale-95"
      >
        <div className="flex flex-col gap-2">
          {showStart && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => run(() => startAIAgent())}
              className={clsx(buttonClass, 'bg-Blue text-white hover:bg-Blue2-600')}
            >
              {t('ai-agent.start', 'Start AI Assistant')}
            </button>
          )}
          {showPauseResume && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => run(() => (isPaused ? resumeAIAgent() : pauseAIAgent()))}
                className={clsx(
                  buttonClass,
                  'flex-1 border border-Gray-200 dark:border-Gray-700 text-Gray-950 dark:text-white hover:bg-Gray-50 dark:hover:bg-Gray-700',
                )}
              >
                {isPaused ? t('ai-agent.resume', 'Resume') : t('ai-agent.pause', 'Pause')}
              </button>
              {isModerator && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => run(() => stopAIAgent('host_stopped'))}
                  className={clsx(buttonClass, 'flex-1 bg-Red-600 text-white hover:bg-Red-700')}
                >
                  {t('ai-agent.stop', 'Stop')}
                </button>
              )}
            </div>
          )}

          {isModerator && showPauseResume && (
            <form onSubmit={sendContext} className="flex flex-col gap-1.5">
              <label
                htmlFor="ai-agent-context"
                className="text-[11px] font-medium text-Gray-700 dark:text-dark-text"
              >
                {t('ai-agent.context-label', 'Whisper instructions')}
              </label>
              <textarea
                id="ai-agent-context"
                rows={2}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t(
                  'ai-agent.context-placeholder',
                  'e.g. summarise the last point, then ask the class one question',
                )}
                className="w-full px-2 py-1 text-xs rounded-md bg-Gray-25 dark:bg-Gray-800 border border-Gray-200 dark:border-Gray-700 text-Gray-950 dark:text-white resize-none focus-ring"
              />
              <button
                type="submit"
                disabled={isBusy || !context.trim()}
                className={clsx(buttonClass, 'bg-Blue text-white hover:bg-Blue2-600')}
              >
                {t('ai-agent.send-context', 'Send to assistant')}
              </button>
            </form>
          )}
        </div>
      </PopoverPanel>
    </Popover>
  );
};

export default AIAgentControlPanel;
