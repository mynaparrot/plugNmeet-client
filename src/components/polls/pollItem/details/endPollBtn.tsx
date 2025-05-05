import React from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import { ClosePollReqSchema } from 'plugnmeet-protocol-js';

import { useClosePollMutation } from '../../../../store/services/pollsApi';

interface EndPollBtnProps {
  pollId: string;
}

const EndPollBtn = ({ pollId }: EndPollBtnProps) => {
  const { t } = useTranslation();
  const [closePoll, { isLoading }] = useClosePollMutation();

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
        <div className="loading absolute text-center top-1/2 -translate-y-1/2 z-[999] left-0 right-0 m-auto">
          <div className="lds-ripple">
            <div className="border-secondaryColor" />
            <div className="border-secondaryColor" />
          </div>
        </div>
      ) : null}
      <button
        className="h-10 3xl:h-11 px-5 flex items-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-buttonShadow"
        onClick={endPoll}
      >
        {t('polls.end-poll')}
      </button>
    </>
  );
};

export default EndPollBtn;
