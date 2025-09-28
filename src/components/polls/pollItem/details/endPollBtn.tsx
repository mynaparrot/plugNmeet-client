import React from 'react';
import { useTranslation } from 'react-i18next';

import { LoadingIcon } from '../../../../assets/Icons/Loading';
import { useEndPoll } from '../../hooks/useEndPoll';

interface EndPollBtnProps {
  pollId: string;
}

const EndPollBtn = ({ pollId }: EndPollBtnProps) => {
  const { t } = useTranslation();
  const { endPoll, isEndingPoll } = useEndPoll();

  return (
    <>
      {isEndingPoll && (
        <div className="absolute text-center top-1/2 -translate-y-1/2 z-999 left-0 right-0 m-auto">
          <LoadingIcon
            className={'inline w-10 h-10 me-3 text-Gray-200 animate-spin'}
            fillColor={'#004D90'}
          />
        </div>
      )}
      <button
        className="h-10 3xl:h-11 cursor-pointer px-5 flex items-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow disabled:opacity-50 disabled:cursor-wait"
        onClick={() => endPoll(pollId)}
        disabled={isEndingPoll}
      >
        {t('polls.end-poll')}
      </button>
    </>
  );
};

export default EndPollBtn;
