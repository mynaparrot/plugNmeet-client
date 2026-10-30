import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

const controlButtonBase =
  'h-8 px-2 inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-[10px] border text-xs font-semibold cursor-pointer transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

const controlButtonVariants = {
  neutral:
    'bg-white dark:bg-Gray-800 border-Gray-300 dark:border-Gray-700 text-Gray-950 dark:text-white hover:bg-Gray-50 dark:hover:bg-Gray-700',
  danger:
    'bg-Red-50 dark:bg-Red-700/25 border-Red-400 text-Red-700 dark:text-Red-100 hover:bg-Red-100 dark:hover:bg-Red-700/40',
};

interface ILiveControlPanelProps {
  formattedTime: string;
  isPaused: boolean;
  isFinished: boolean;
  isLoading: boolean;
  onPause: () => void;
  onResume: () => void;
  onExtend: () => void;
  onEndTimer: () => void;
  onSetNewTimer: () => void;
}

const LiveControlPanel = ({
  formattedTime,
  isPaused,
  isFinished,
  isLoading,
  onPause,
  onResume,
  onExtend,
  onEndTimer,
  onSetNewTimer,
}: ILiveControlPanelProps) => {
  const { t } = useTranslation();

  const statusLabel = isFinished
    ? t('countdown-timer.ended')
    : isPaused
      ? t('countdown-timer.paused')
      : t('countdown-timer.running');

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-Gray-950 dark:text-white">
          {t('countdown-timer.title')}
        </p>
        <span
          className={clsx(
            'px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
            isFinished
              ? 'bg-Red-100 text-Red-700 dark:bg-Red-700/30 dark:text-Red-100'
              : isPaused
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-Green-100 text-Green-700 dark:bg-Gray-700 dark:text-white',
          )}
        >
          {statusLabel}
        </span>
      </div>
      <div
        dir="ltr"
        className="text-2xl font-bold tabular-nums text-center py-2 text-Gray-950 dark:text-white"
      >
        {formattedTime}
      </div>
      <div className="flex flex-nowrap items-center justify-center gap-1.5">
        {isFinished ? (
          <button
            type="button"
            onClick={onSetNewTimer}
            disabled={isLoading}
            className={clsx(controlButtonBase, controlButtonVariants.neutral)}
          >
            {t('countdown-timer.set-new-timer')}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={isPaused ? onResume : onPause}
              disabled={isLoading}
              className={clsx(controlButtonBase, controlButtonVariants.neutral)}
            >
              {isPaused ? t('countdown-timer.resume') : t('countdown-timer.pause')}
            </button>
            <button
              type="button"
              onClick={onExtend}
              disabled={isLoading}
              className={clsx(controlButtonBase, controlButtonVariants.neutral)}
            >
              {t('countdown-timer.extend')}
            </button>
          </>
        )}
        {!isFinished && (
          <button
            type="button"
            onClick={onEndTimer}
            disabled={isLoading}
            className={clsx(controlButtonBase, controlButtonVariants.danger)}
          >
            {t('countdown-timer.end-timer')}
          </button>
        )}
      </div>
    </>
  );
};

export default LiveControlPanel;
