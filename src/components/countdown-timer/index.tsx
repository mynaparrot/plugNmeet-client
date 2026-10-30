import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import clsx from 'clsx';

import useCountdownTimerState from './hooks/useCountdownTimerState';
import useCountdownTimerActions from './hooks/useCountdownTimerActions';
import TimerBadgeContent from './timerBadgeContent';
import { getTimerBadgeClasses } from './utils';
import SetupPanel from './setupPanel';
import LiveControlPanel from './liveControlPanel';

export interface ITimerBadgeState {
  isIdle: boolean;
  isPaused: boolean;
  isUrgent: boolean;
  isFinished: boolean;
}

const CountdownTimer = () => {
  const { t } = useTranslation();
  const {
    isAdmin,
    isRecorder,
    isAllow,
    isActive,
    formattedTime,
    isIdle,
    isPaused,
    isFinished,
    isUrgent,
  } = useCountdownTimerState();
  const { isLoading, startTimer, pauseTimer, resumeTimer, extendTimer, stopTimer } =
    useCountdownTimerActions();
  const [isSettingNewTimer, setIsSettingNewTimer] = useState(false);

  if (isRecorder || !isAllow || !isActive || (!isAdmin && isIdle)) {
    return null;
  }

  const badgeState: ITimerBadgeState = { isIdle, isPaused, isUrgent, isFinished };
  const badgeClasses = getTimerBadgeClasses(badgeState);

  if (!isAdmin) {
    return (
      <div
        role="timer"
        aria-live="off"
        aria-label={t('countdown-timer.aria-label')}
        className={badgeClasses}
      >
        <TimerBadgeContent {...badgeState} formattedTime={formattedTime} />
      </div>
    );
  }

  return (
    <Popover className="relative">
      <PopoverButton
        aria-label={t('countdown-timer.aria-label')}
        className={clsx('group cursor-pointer focus-ring', badgeClasses)}
      >
        <TimerBadgeContent {...badgeState} formattedTime={formattedTime} showChevron />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        transition
        className="w-80 max-w-[calc(100vw-2rem)] p-3 rounded-md shadow-lg z-50 bg-white dark:bg-dark-primary border border-Gray-100 dark:border-Gray-700 focus:outline-hidden [--anchor-gap:8px] transition ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
      >
        {isIdle || (isFinished && isSettingNewTimer) ? (
          <SetupPanel
            isLoading={isLoading}
            onStart={(durationSeconds) => {
              setIsSettingNewTimer(false);
              void startTimer(durationSeconds);
            }}
          />
        ) : (
          <LiveControlPanel
            formattedTime={formattedTime}
            isPaused={isPaused}
            isFinished={isFinished}
            isLoading={isLoading}
            onPause={pauseTimer}
            onResume={resumeTimer}
            onExtend={extendTimer}
            onEndTimer={stopTimer}
            onSetNewTimer={() => setIsSettingNewTimer(true)}
          />
        )}
      </PopoverPanel>
    </Popover>
  );
};

export default CountdownTimer;
