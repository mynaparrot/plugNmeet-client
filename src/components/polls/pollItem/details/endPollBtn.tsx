import React from 'react';
import { useTranslation } from 'react-i18next';

import { useEndPoll } from '../../hooks/useEndPoll';
import ActionButton from '../../../../helpers/ui/actionButton';

interface EndPollBtnProps {
  pollId: string;
}

const EndPollBtn = ({ pollId }: EndPollBtnProps) => {
  const { t } = useTranslation();
  const { endPoll, isEndingPoll } = useEndPoll();

  return (
    <ActionButton
      onClick={() => endPoll(pollId)}
      isLoading={isEndingPoll}
      buttonType="button"
      custom="w-44 !text-white bg-Red-400 !border-Red-600 hover:!bg-Red-600"
    >
      {t('polls.end-poll')}
    </ActionButton>
  );
};

export default EndPollBtn;
