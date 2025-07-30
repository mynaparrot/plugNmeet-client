import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import { ClosePollReqSchema } from 'plugnmeet-protocol-js';

import { useClosePollMutation } from '../../../../store/services/pollsApi';
import { addUserNotification } from '../../../../store/slices/roomSettingsSlice';
import { useAppDispatch } from '../../../../store';
import { LoadingIcon } from '../../../../assets/Icons/Loading';

interface EndPollBtnProps {
  pollId: string;
}

const EndPollBtn = ({ pollId }: EndPollBtnProps) => {
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

  const endPoll = () => {
    if (isLoading) {
      return;
    }
    closePoll(
      create(ClosePollReqSchema, {
        pollId: pollId,
      }),
    );
  };

  return (
    <>
      {isLoading ? (
        <div className="absolute text-center top-1/2 -translate-y-1/2 z-999 left-0 right-0 m-auto">
          <LoadingIcon
            className={'inline w-10 h-10 me-3 text-Gray-200 animate-spin'}
            fillColor={'#004D90'}
          />
        </div>
      ) : null}
      <button
        className="h-10 3xl:h-11 cursor-pointer px-5 flex items-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow"
        onClick={endPoll}
      >
        {t('polls.end-poll')}
      </button>
    </>
  );
};

export default EndPollBtn;
