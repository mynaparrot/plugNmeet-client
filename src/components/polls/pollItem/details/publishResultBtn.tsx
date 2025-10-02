import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PollDataWithOption, publishPollResultByChat } from '../../utils';
import ActionButton from '../../../../helpers/ui/actionButton';

interface PublishResultBtnProps {
  pollDataWithOption: PollDataWithOption;
  onCloseViewDetails: () => void;
}

const PublishResultBtn = ({
  pollDataWithOption,
  onCloseViewDetails,
}: PublishResultBtnProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const publishByChat = () => {
    setIsLoading(true);
    publishPollResultByChat(pollDataWithOption).finally(() =>
      onCloseViewDetails(),
    );
  };

  return (
    <ActionButton
      onClick={publishByChat}
      isLoading={isLoading}
      buttonType="button"
      custom="w-44"
    >
      {t('polls.publish-result')}
    </ActionButton>
  );
};
export default PublishResultBtn;
