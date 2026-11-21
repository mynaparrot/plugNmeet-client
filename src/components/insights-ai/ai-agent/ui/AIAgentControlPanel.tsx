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
import { AiIconSVG } from '../../../../assets/Icons/AiIconSVG';
import { DropdownIconSVG } from '../../../../assets/Icons/DropdownIconSVG';

const buttonClass =
  'h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

interface IAIAgentControlPanelProps {
  canControl: boolean;
  /** Live connected timer from the status bar; null when nothing is running. */
  elapsedTime: string | null;
  agentName: string;
  /** Localized current status; shown while no timer is running yet. */
  statusLabel: string;
}

/**
 * Start/pause/resume/stop controls for everyone the server lets drive the
 * session: a moderator, or the participant of a 1-on-1 AI session.
 */
const AIAgentControlPanel = ({
  canControl,
  elapsedTime,
  agentName,
  statusLabel,
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

  const showStart = canControl && !isRunning;
  const showPauseResume = canControl && isRunning;

  if (!showStart && !showPauseResume) {
    return null;
  }

  return (
    <Popover className="relative">
      <PopoverButton
        aria-label={t('ai-agent.controls')}
        className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md text-Gray-700 dark:text-dark-text hover:bg-Gray-100 dark:hover:bg-Gray-700 cursor-pointer focus-ring transition-transform data-[open]:rotate-180"
      >
        <DropdownIconSVG />
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-9999 w-64 p-3.5 mt-1.5 rounded-xl bg-white dark:bg-dark-secondary2 border border-Gray-200 dark:border-Gray-700 shadow-lg transition data-[closed]:opacity-0 data-[closed]:scale-95"
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-Gray-200 dark:border-Gray-700">
            <span className="w-8 h-8 rounded-lg bg-Blue/10 dark:bg-Blue/20 text-Blue dark:text-white flex items-center justify-center shrink-0">
              <AiIconSVG classes="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-Gray-950 dark:text-white truncate">
                {agentName}
              </span>
              <span className="text-[11px] font-medium text-Gray-600 dark:text-Gray-300 truncate">
                {showPauseResume && elapsedTime ? (
                  <>
                    {t('ai-agent.connected-time')}:{' '}
                    <span dir="ltr" className="tabular-nums">
                      {elapsedTime}
                    </span>
                  </>
                ) : (
                  statusLabel
                )}
              </span>
            </div>
          </div>
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
            <div className="flex gap-2.5">
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
              <button
                type="button"
                disabled={isBusy}
                onClick={() => run(() => stopAIAgent())}
                className={clsx(buttonClass, 'flex-1 bg-Red-600 text-white hover:bg-Red-700')}
              >
                {t('ai-agent.stop')}
              </button>
            </div>
          )}
        </div>
      </PopoverPanel>
    </Popover>
  );
};

export default AIAgentControlPanel;
