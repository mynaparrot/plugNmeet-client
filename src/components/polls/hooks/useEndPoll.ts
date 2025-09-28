import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import { ClosePollReqSchema } from 'plugnmeet-protocol-js';

import { useClosePollMutation } from '../../../store/services/pollsApi';
import { useAppDispatch } from '../../../store';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';

export const useEndPoll = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [closePoll, { data: closePollRes, isLoading }] = useClosePollMutation();

  useEffect(() => {
    if (closePollRes) {
      if (closePollRes.status) {
        dispatch(
          addUserNotification({
            message: t('polls.end-poll-success'),
            typeOption: 'info',
          }),
        );
      } else {
        dispatch(
          addUserNotification({
            message: t(closePollRes.msg),
            typeOption: 'error',
          }),
        );
      }
    }
  }, [closePollRes, dispatch, t]);

  const endPoll = (pollId: string) => {
    if (isLoading) {
      return;
    }
    closePoll(
      create(ClosePollReqSchema, {
        pollId,
      }),
    );
  };

  return { endPoll, isEndingPoll: isLoading };
};
