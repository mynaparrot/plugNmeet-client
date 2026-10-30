import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  addUserNotification,
  updatePlayAudioNotification,
} from '../../../store/slices/roomSettingsSlice';

const TICK_INTERVAL_MS = 250;
const URGENT_SECONDS = 10;

export type CountdownTimerStatus = 'idle' | 'running' | 'paused';

const pad = (value: number) => value.toString().padStart(2, '0');

export const formatTime = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(safe % 60)}`
    : `${pad(minutes)}:${pad(safe % 60)}`;
};

const useCountdownTimerState = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const timerFeatures = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomFeatures?.countdownTimerFeatures,
  );
  const isAdmin = useAppSelector((state) => state.session.currentUser?.metadata?.isAdmin);
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  const status = (timerFeatures?.status || 'idle') as CountdownTimerStatus;
  const endTime = Number(timerFeatures?.endTime ?? 0);
  const pausedRemaining = timerFeatures?.remainingSeconds ?? 0;

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    status === 'running' && endTime > 0 ? Math.max(0, Math.ceil((endTime - Date.now()) / 1000)) : 0,
  );
  // -1 until the first measurement, so a late join never fakes a "reached zero" transition.
  const previousRemainingRef = useRef(-1);
  const notifiedEndTimeRef = useRef(0);

  useEffect(() => {
    if (status === 'paused') {
      setRemainingSeconds(pausedRemaining);
      return;
    }
    if (status !== 'running' || endTime <= 0) {
      setRemainingSeconds(0);
      return;
    }

    const tick = () => setRemainingSeconds(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, TICK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [status, endTime, pausedRemaining]);

  useEffect(() => {
    const previous = previousRemainingRef.current;
    previousRemainingRef.current = remainingSeconds;

    if (status !== 'running' || endTime <= 0 || previous <= 0 || remainingSeconds > 0) {
      return;
    }
    if (notifiedEndTimeRef.current === endTime) {
      return;
    }

    notifiedEndTimeRef.current = endTime;
    dispatch(updatePlayAudioNotification(true));
    dispatch(
      addUserNotification({
        message: t('countdown-timer.ended-notification'),
        typeOption: 'info',
      }),
    );
  }, [status, endTime, remainingSeconds, dispatch, t]);

  const isIdle = status === 'idle';
  const isPaused = status === 'paused';

  return {
    isAdmin: !!isAdmin,
    isRecorder: !!isRecorder,
    isAllow: !!timerFeatures?.isAllow,
    isActive: !!timerFeatures?.isActive,
    status,
    remainingSeconds,
    formattedTime: formatTime(remainingSeconds),
    isIdle,
    isPaused,
    isFinished: status === 'running' && remainingSeconds === 0,
    isUrgent: status === 'running' && remainingSeconds > 0 && remainingSeconds <= URGENT_SECONDS,
  };
};

export default useCountdownTimerState;
