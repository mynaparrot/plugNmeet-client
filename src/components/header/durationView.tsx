import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import { useRoomDurationCountdown } from '../../helpers/hooks/useRoomDurationCountdown';

const DurationView = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isRecorder = store.getState().session.currentUser?.isRecorder;
  const roomDuration = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomFeatures?.roomDuration,
  );
  const startedAt = useAppSelector(
    (state) => state.session.currentRoom.metadata?.startedAt,
  );

  const endTime = useMemo(() => {
    const duration = Number(roomDuration);
    if (!duration) {
      return 0;
    }
    const startTimeInMs = startedAt ? Number(startedAt) * 1000 : Date.now();
    const durationInMs = duration * 60 * 1000;
    return startTimeInMs + durationInMs;
  }, [roomDuration, startedAt]);

  const remaining = useRoomDurationCountdown(endTime);

  // Show the clock only if the initial room duration is 60 minutes or less.
  const showClock = useMemo(() => {
    const duration = Number(roomDuration);
    return duration > 0 && duration <= 60;
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
  }, [remaining, isRecorder, dispatch, t]);

  return (
    showClock && (
      <div className="timer text-xs md:text-sm border border-solid border-primary-color dark:border-dark-text/80 dark:text-dark-text/80 sm:py-[2px] px-3 rounded-lg mt-[2px] mr-[6px]">
        {remaining}
      </div>
    )
  );
};

export default DurationView;
