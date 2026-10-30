import { useTranslation } from 'react-i18next';

import { TimerIconSVG } from '../../assets/Icons/TimerIconSVG';
import { ITimerBadgeState } from './index';

interface ITimerBadgeContentProps extends ITimerBadgeState {
  formattedTime: string;
  showChevron?: boolean;
}

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
