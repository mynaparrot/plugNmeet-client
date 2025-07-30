import React from 'react';
import { useTranslation } from 'react-i18next';

import { PollDataWithOption, publishPollResultByChat } from '../../utils';

interface PublishResultBtnProps {
  pollDataWithOption: PollDataWithOption;
  onCloseViewDetails: () => void;
}

const PublishResultBtn = ({
  pollDataWithOption,
  onCloseViewDetails,
}: PublishResultBtnProps) => {
  const { t } = useTranslation();

  const publishByChat = async () => {
    await publishPollResultByChat(pollDataWithOption);
    onCloseViewDetails();
  };

  return (
    <button
      className="h-10 3xl:h-11 cursor-pointer px-5 flex items-center justify-center w-full rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Blue border border-Dark-blue transition-all duration-300 hover:bg-Dark-blue shadow-button-shadow"
      onClick={() => publishByChat()}
    >
      {t('polls.publish-result')}
    </button>
  );
};
export default PublishResultBtn;
