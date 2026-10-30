import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import ActionButton from '../../helpers/ui/actionButton';
import { clampDurationInput } from './utils';

const PRESETS = [1, 3, 5, 10, 15];

interface ISetupPanelProps {
  isLoading: boolean;
  onStart: (durationSeconds: number) => void;
}

const SetupPanel = ({ isLoading, onStart }: ISetupPanelProps) => {
  const { t } = useTranslation();
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const totalSeconds = minutes * 60 + seconds;

  return (
    <>
      <p className="mb-2 text-sm font-semibold text-Gray-950 dark:text-white">
        {t('countdown-timer.title')}
      </p>
      <div
        role="group"
        aria-label={t('countdown-timer.presets')}
        className="flex flex-wrap items-center gap-1 mb-2.5"
      >
        {PRESETS.map((preset) => {
          const isSelected = minutes === preset && seconds === 0;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setMinutes(preset);
                setSeconds(0);
              }}
              className={clsx(
                'h-7 px-2 rounded-[8px] border text-xs font-semibold cursor-pointer transition-colors focus-ring',
                isSelected
                  ? 'bg-Blue2-50 dark:bg-Gray-700 border-Blue2-500 text-Blue2-800 dark:text-white'
                  : 'bg-white dark:bg-Gray-800 border-Gray-300 dark:border-Gray-700 text-Gray-950 dark:text-white hover:bg-Gray-50 dark:hover:bg-Gray-700',
              )}
            >
              {t('countdown-timer.preset-min', { count: preset })}
            </button>
          );
        })}
      </div>
      <div dir="ltr" className="flex items-start justify-center gap-1.5 mb-3">
        <div className="flex flex-col items-center gap-1">
          <label
            htmlFor="countdown-timer-minutes"
            className="text-[10px] font-semibold uppercase tracking-wide text-Gray-600 dark:text-Gray-500"
          >
            {t('countdown-timer.minutes')}
          </label>
          <input
            id="countdown-timer-minutes"
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={minutes}
            onChange={(e) => setMinutes(clampDurationInput(e.target.value, 99))}
            className="default-input h-9 w-14 px-1 text-center tabular-nums"
          />
        </div>
        <span
          aria-hidden="true"
          className="pt-4.5 text-base font-bold text-Gray-950 dark:text-white"
        >
          :
        </span>
        <div className="flex flex-col items-center gap-1">
          <label
            htmlFor="countdown-timer-seconds"
            className="text-[10px] font-semibold uppercase tracking-wide text-Gray-600 dark:text-Gray-500"
          >
            {t('countdown-timer.seconds')}
          </label>
          <input
            id="countdown-timer-seconds"
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={seconds}
            onChange={(e) => setSeconds(clampDurationInput(e.target.value, 59))}
            className="default-input h-9 w-14 px-1 text-center tabular-nums"
          />
        </div>
      </div>
      <ActionButton
        buttonType="button"
        onClick={() => onStart(totalSeconds)}
        disabled={totalSeconds <= 0}
        isLoading={isLoading}
        custom="w-full h-8 rounded-[10px]"
      >
        {t('countdown-timer.start')}
      </ActionButton>
    </>
  );
};

export default SetupPanel;
