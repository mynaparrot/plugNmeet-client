import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  addUserNotification,
  updatePlayAudioNotification,
} from '../../../store/slices/roomSettingsSlice';
import { aiAgentSelector } from '../../../store/slices/aiAgentSlice';
import { sendAIAgentContext } from '../../insights-ai/ai-agent/api';
import { isAIAgentRunning } from '../../insights-ai/ai-agent/ui/statusModel';
import {
  formatTime,
  getRemainingSeconds,
  getTimerFlags,
  shouldNotifyTimerEnd,
  shouldNotifyTimerUrgent,
  TICK_INTERVAL_MS,
  type CountdownTimerStatus,
} from '../utils';

const useCountdownTimerState = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const timerFeatures = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomFeatures?.countdownTimerFeatures,
  );
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  const status = (timerFeatures?.status || 'idle') as CountdownTimerStatus;
  const endTime = Number(timerFeatures?.endTime ?? 0);
  const pausedRemaining = timerFeatures?.remainingSeconds ?? 0;

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds({ status, endTime, pausedRemaining, nowMs: Date.now() }),
  );
  // -1 until the first measurement, so a late join never fakes a "reached zero" transition.
  const previousRemainingRef = useRef(-1);
  const notifiedEndTimeRef = useRef(0);
  const notifiedUrgentEndTimeRef = useRef(0);

  useEffect(() => {
    const update = () =>
      setRemainingSeconds(
        getRemainingSeconds({ status, endTime, pausedRemaining, nowMs: Date.now() }),
      );

    if (status !== 'running' || endTime <= 0) {
      update();
      return;
    }

    update();
    const interval = window.setInterval(update, TICK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [status, endTime, pausedRemaining]);

  useEffect(() => {
    const previousSeconds = previousRemainingRef.current;
    previousRemainingRef.current = remainingSeconds;

    // Only a live agent in this room can react to the timer, and the recorder
    // must never drive one.
    const isAgentLive = () => !isRecorder && isAIAgentRunning(aiAgentSelector(store.getState()));

    const urgent = shouldNotifyTimerUrgent({
      status,
      endTime,
      previousSeconds,
      currentSeconds: remainingSeconds,
      notifiedEndTime: notifiedUrgentEndTimeRef.current,
    });
    if (urgent) {
      notifiedUrgentEndTimeRef.current = endTime;
      if (isAgentLive()) {
        void sendAIAgentContext(
          `10 seconds remaining on the countdown timer (${remainingSeconds}s left). Give the participant a brief heads-up that time is almost up.`,
          'countdown_timer',
        );
      }
    }

    const ended = shouldNotifyTimerEnd({
      status,
      endTime,
      previousSeconds,
      currentSeconds: remainingSeconds,
      notifiedEndTime: notifiedEndTimeRef.current,
    });
    if (!ended) {
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
    if (isAgentLive()) {
      void sendAIAgentContext(
        'The countdown timer has finished (00:00). Let the participant know that time is up. If they were working on an exercise on the whiteboard or in the shared notepad, inspect their work now (call whiteboard_capture_snapshot or notepad_read) and review it with them.',
        'countdown_timer',
      );
    }
  }, [status, endTime, remainingSeconds, dispatch, t, isRecorder]);

  return {
    isAdmin: !!isAdmin,
    isRecorder: !!isRecorder,
    isAllow: !!timerFeatures?.isAllow,
    isActive: !!timerFeatures?.isActive,
    status,
    remainingSeconds,
    formattedTime: formatTime(remainingSeconds),
    ...getTimerFlags(status, remainingSeconds),
  };
};

export default useCountdownTimerState;
