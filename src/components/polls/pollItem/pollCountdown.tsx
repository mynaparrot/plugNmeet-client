import React, { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const formatCountdown = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// expiry ticking lives here so the 1s tick never re-renders the whole PollItem
const usePollRemaining = (expiresAt: number, isRunning: boolean) => {
  const [remaining, setRemaining] = useState<number>(() =>
    expiresAt > 0 ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000)) : 0,
  );

  useEffect(() => {
    if (!isRunning || expiresAt <= 0) {
      return;
    }
    const tick = () => setRemaining(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, expiresAt]);

  return remaining;
};

interface PollCountdownProps {
  expiresAt: number;
  isRunning: boolean;
}

// header pill; isolated so the 1s tick never re-renders the whole PollItem
const PollCountdown = ({ expiresAt, isRunning }: PollCountdownProps) => {
  const { t } = useTranslation();
  const remaining = usePollRemaining(expiresAt, isRunning);

  if (!isRunning || expiresAt <= 0) {
    return null;
  }

  return (
    <span
      className="border border-Blue2-600 dark:border-Blue2-500 bg-Blue2-500 dark:bg-Blue2-500 shadow-button-shadow dark:shadow-none rounded-full h-[22px] px-2 text-xs text-white font-semibold tabular-nums flex items-center"
      aria-label={t('polls.time-remaining')}
      title={t('polls.time-remaining')}
      // plain mm:ss digits; keep the colon order stable in RTL layouts
      dir="ltr"
    >
      {formatCountdown(remaining)}
    </span>
  );
};

export default memo(PollCountdown);
