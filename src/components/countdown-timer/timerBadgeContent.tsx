import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import { TimerIconSVG } from '../../assets/Icons/TimerIconSVG';

export interface ITimerBadgeState {
  isIdle: boolean;
  isPaused: boolean;
  isUrgent: boolean;
  isFinished: boolean;
}

interface ITimerBadgeContentProps extends ITimerBadgeState {
  formattedTime: string;
  showChevron?: boolean;
}

export const getTimerBadgeClasses = ({
  isIdle,
  isPaused,
  isUrgent,
  isFinished,
}: ITimerBadgeState) =>
  clsx(
    'h-7 md:h-8 flex items-center gap-1.5 px-2 md:px-2.5 rounded-[10px] border text-xs md:text-sm font-medium transition-colors shadow-sm md:shadow-none',
    isUrgent || isFinished
      ? 'bg-Red-50 dark:bg-Red-700/25 border-Red-400 text-Red-700 dark:text-Red-100'
      : isPaused
        ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 text-amber-800 dark:text-amber-300'
        : isIdle
          ? 'bg-Gray-100 dark:bg-Gray-800 border-Gray-300 dark:border-Gray-700 text-Gray-950 dark:text-white hover:bg-Gray-200/70 dark:hover:bg-Gray-700'
          : 'bg-Blue2-50 dark:bg-Gray-800 border-Gray-200 dark:border-Gray-700 text-Blue2-800 dark:text-white',
    isUrgent && 'animate-pulse',
  );

const TimerBadgeContent = ({
  formattedTime,
  isIdle,
  isPaused,
  showChevron,
}: ITimerBadgeContentProps) => {
  const { t } = useTranslation();

  return (
    <>
      <TimerIconSVG classes="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
      {isIdle ? (
        <span className="font-semibold whitespace-nowrap">{t('countdown-timer.set-timer')}</span>
      ) : (
        <span dir="ltr" className="tabular-nums font-semibold tracking-tight">
          {formattedTime}
        </span>
      )}
      {isPaused && (
        <span className="hidden md:inline text-[10px] font-bold uppercase opacity-80">
          {t('countdown-timer.paused')}
        </span>
      )}
      {showChevron && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="w-3 h-3 shrink-0 opacity-70 transition-transform duration-200 group-data-[open]:rotate-180"
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </>
  );
};

export default TimerBadgeContent;
