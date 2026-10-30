import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  CountdownTimerReqSchema,
  CountdownTimerTask,
} from 'plugnmeet-protocol-js';

import { useAppDispatch } from '../../../store';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

const useCountdownTimerActions = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const sendTask = async (task: CountdownTimerTask, durationSeconds?: number) => {
    setIsLoading(true);
    try {
      const body = create(CountdownTimerReqSchema, { task, durationSeconds });
      const r = await sendAPIRequest(
        'countdownTimer',
        toBinary(CountdownTimerReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

      if (!res.status && res.msg) {
        dispatch(addUserNotification({ message: t(res.msg), typeOption: 'error' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    startTimer: (durationSeconds: number) =>
      sendTask(CountdownTimerTask.START_TIMER, durationSeconds),
    pauseTimer: () => sendTask(CountdownTimerTask.PAUSE_TIMER),
    resumeTimer: () => sendTask(CountdownTimerTask.RESUME_TIMER),
    extendTimer: () => sendTask(CountdownTimerTask.EXTEND_TIMER, 60),
    stopTimer: () => sendTask(CountdownTimerTask.STOP_TIMER),
  };
};

export default useCountdownTimerActions;
