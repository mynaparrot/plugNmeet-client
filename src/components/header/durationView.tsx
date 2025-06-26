import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';

const DurationView = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isRecorder = store.getState().session.currentUser?.isRecorder;
  const roomDuration = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomFeatures?.roomDuration,
  );

  const [remaining, setRemaining] = useState<string>('00:00');
  // if duration is less than 60 minutes then we'll show clock only.
  const [showClock, setShowClock] = useState<boolean>(false);

  useEffect(() => {
    const duration = Number(roomDuration);
    if (!duration || duration == 0) {
      return;
    }

    const startedAt = store.getState().session.currentRoom.metadata?.startedAt;
    const start = startedAt ? Number(startedAt) * 1000 : Date.now();
    let diff, minutes, seconds;
    setRemaining('00:00');

    const timer = () => {
      diff = duration * 60 - (((Date.now() - start) / 1000) | 0);

      minutes = (diff / 60) | 0;
      seconds = diff % 60 | 0;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      seconds = seconds < 10 ? '0' + seconds : seconds;

      setRemaining(minutes + ':' + seconds);
      if (minutes < 60) {
        setShowClock(true);
      }
      if (diff <= 0) {
        setRemaining('00:00');
      }
    };

    const interval = setInterval(() => {
      timer();
    }, 1000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [roomDuration]);

  useEffect(() => {
    if (isRecorder) {
      return;
    }

    switch (remaining) {
      case '60:00':
      case '30:00':
      case '10:00':
      case '5:00':
        dispatch(
          addUserNotification({
            message: t('notifications.room-will-end-in', {
              minutes: remaining,
            }),
            typeOption: 'warning',
          }),
        );
    }
    //eslint-disable-next-line
  }, [remaining]);

  return !roomDuration ? null : (
    <>
      {showClock ? (
        <div className="timer text-xs md:text-sm border border-solid border-primary-color dark:border-dark-text/80 dark:text-dark-text/80 sm:py-[2px] px-3 rounded-lg mt-[2px] mr-[6px]">
          {remaining}
        </div>
      ) : null}
    </>
  );
};

export default DurationView;
