import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import { ReopenPollReqSchema } from 'plugnmeet-protocol-js';

import { useReopenPollMutation } from '../../../store/services/pollsApi';
import { useAppDispatch } from '../../../store';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';

export const useReopenPoll = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [reopenPoll, { data: reopenPollRes, isLoading }] =
    useReopenPollMutation();

  useEffect(() => {
    if (reopenPollRes) {
      if (reopenPollRes.status) {
        dispatch(
          addUserNotification({
            message: t('polls.notifications.reopen-poll-success'),
            typeOption: 'info',
          }),
        );
      } else {
        dispatch(
          addUserNotification({
            message: t(reopenPollRes.msg),
            typeOption: 'error',
          }),
        );
      }
    }
  }, [reopenPollRes, dispatch, t]);

  const reopen = (pollId: string) => {
    if (isLoading) {
      return;
    }
    reopenPoll(
      create(ReopenPollReqSchema, {
        pollId,
      }),
    );
  };

  return { reopenPoll: reopen, isReopeningPoll: isLoading };
};
