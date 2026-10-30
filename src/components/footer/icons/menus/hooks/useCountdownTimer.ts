import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  CountdownTimerReqSchema,
  CountdownTimerTask,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '../../../../../store';
import { addUserNotification } from '../../../../../store/slices/roomSettingsSlice';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';

const useCountdownTimer = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const isActiveCountdownTimer = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomFeatures?.countdownTimerFeatures?.isActive,
  );

  const toggleCountdownTimer = useCallback(async () => {
    const body = create(CountdownTimerReqSchema, {
      task: CountdownTimerTask.CHANGE_STATUS,
      isActive: !isActiveCountdownTimer,
    });

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
  }, [isActiveCountdownTimer, dispatch, t]);

  return { toggleCountdownTimer, isActiveCountdownTimer };
};

export default useCountdownTimer;
