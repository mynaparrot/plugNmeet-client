import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../store';
import { TimerIconSVG } from '../../assets/Icons/TimerIconSVG';

/**
 * Waiting-room queue card. It subscribes to queue updates and owns the ETA tick
 * so the landing modal does not re-render while a participant waits for a slot.
 */
const QueueStatus = () => {
  const { t } = useTranslation();
  const waitingQueueInfo = useAppSelector(
    (state) => state.session.currentUser?.metadata?.waitingQueueInfo,
  );
  const [nowTs, setNowTs] = useState(() => Date.now());

  const position = Number(waitingQueueInfo?.position ?? 0);
  const totalWaiting = Number(waitingQueueInfo?.totalWaiting ?? 0);
  const estimatedTurnAt = Number(waitingQueueInfo?.estimatedTurnAt ?? 0);
  const estimatedWaitSeconds = Number(waitingQueueInfo?.estimatedWaitSeconds ?? 0);

  useEffect(() => {
    if (position < 1) {
      return;
    }
    const id = setInterval(() => setNowTs(Date.now()), 15000);
    return () => clearInterval(id);
  }, [position]);

  const waitMinutes = useMemo(() => {
    const waitMs = estimatedTurnAt > 0 ? estimatedTurnAt - nowTs : estimatedWaitSeconds * 1000;
    return Math.max(1, Math.ceil(waitMs / 60000));
  }, [estimatedTurnAt, estimatedWaitSeconds, nowTs]);

  if (position < 1) {
    return null;
  }

  const total = Math.max(totalWaiting, position, 1);
  const isNext = position <= 1;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="w-full max-w-[20rem] rounded-xl border border-Gray-200 bg-white px-4 py-3 text-center shadow-box1 dark:border-Gray-700 dark:bg-dark-secondary2"
    >
      <div className="flex items-center justify-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-Gray-600 dark:text-white/70">
          {t('ai-agent.waiting-queue.position-label')}
        </span>
        {isNext && (
          <span className="rounded-full bg-Green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-Green-700">
            {t('ai-agent.waiting-queue.you-are-next')}
          </span>
        )}
      </div>
      <div dir="ltr" className="mt-0.5 flex items-baseline justify-center gap-1 tabular-nums">
        <span className="text-3xl font-bold leading-none text-Gray-950 dark:text-white">
          #{position}
        </span>
        <span className="text-sm font-medium text-Gray-500 dark:text-white/60">/ {total}</span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-Blue2-50 px-2.5 py-1.5 text-Blue2-700 dark:bg-dark-secondary3 dark:text-dark-text">
        <TimerIconSVG classes="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-medium">
          {t('ai-agent.waiting-queue.expected-join', { count: waitMinutes })}
        </span>
      </div>
    </div>
  );
};

export default QueueStatus;
