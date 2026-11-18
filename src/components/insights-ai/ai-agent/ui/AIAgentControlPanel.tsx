import { useState } from 'react';
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
  /** Live connected timer from the status bar; null when nothing is running. */
  elapsedTime: string | null;
}

/**
 * Start/pause/resume/stop controls. Moderators get every action; a student in
 * a 1-on-1 session may only pause and resume a running agent.
 */
const AIAgentControlPanel = ({
  isModerator,
  canControl,
  elapsedTime,
}: IAIAgentControlPanelProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const agent = useAppSelector(aiAgentSelector);
  const isRunning = isAIAgentRunning(agent);
  const isPaused = isAIAgentPaused(agent);
  const [isBusy, setIsBusy] = useState(false);

  const run = async (task: () => Promise<AIAgentApiResult>) => {
    setIsBusy(true);
    try {
      const res = await task();
      if (!res.status) {
        dispatch(
          addUserNotification({
            message: t(res.msg || 'ai-agent.errors.generic'),
            typeOption: 'error',
          }),
        );
        return false;
      }
      if (isAIAgentLiveState(res.state)) {
        applyAIAgentState(res.state);
      }
      return true;
    } finally {
      setIsBusy(false);
    }
  };

  const showStart = isModerator && !isRunning;
  const showPauseResume = canControl && isRunning;

  if (!showStart && !showPauseResume) {
    return null;
  }

  return (
    <Popover className="relative">
      <PopoverButton
        aria-label={t('ai-agent.controls')}
        className="h-6 px-1.5 flex items-center gap-0.5 rounded-md text-[11px] font-medium text-Gray-700 dark:text-dark-text hover:bg-Gray-100 dark:hover:bg-Gray-700 cursor-pointer focus-ring"
      >
        {t('ai-agent.controls-short')}
        <DropdownIconSVG />
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-9999 w-48 p-2.5 mt-1.5 rounded-lg bg-white dark:bg-dark-secondary2 border border-Gray-200 dark:border-Gray-700 shadow-lg transition data-[closed]:opacity-0 data-[closed]:scale-95"
      >
        <div className="flex flex-col gap-2">
          {showPauseResume && elapsedTime && (
            <div className="flex items-baseline justify-between gap-2 pb-2 border-b border-Gray-200 dark:border-Gray-700">
              <span className="text-[11px] font-medium text-Gray-600 dark:text-Gray-300">
                {t('ai-agent.connected-time')}
              </span>
              <span dir="ltr" className="text-xs font-semibold tabular-nums">
                {elapsedTime}
              </span>
            </div>
          )}
          {showStart && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => run(() => startAIAgent())}
              className={clsx(buttonClass, 'bg-Blue text-white hover:bg-Blue2-600')}
            >
              {t('ai-agent.start')}
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
                {isPaused ? t('ai-agent.resume') : t('ai-agent.pause')}
              </button>
              {isModerator && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => run(() => stopAIAgent('host_stopped'))}
                  className={clsx(buttonClass, 'flex-1 bg-Red-600 text-white hover:bg-Red-700')}
                >
                  {t('ai-agent.stop')}
                </button>
              )}
            </div>
          )}
        </div>
      </PopoverPanel>
    </Popover>
  );
};

export default AIAgentControlPanel;
