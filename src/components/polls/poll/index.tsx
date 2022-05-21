import React from 'react';
import { PollListItem } from '../../../store/services/pollsApiTypes';
import TotalResponses from './totalResponses';
import MyVoteStatus from './myVoteStatus';
import { useTranslation } from 'react-i18next';

interface IPollPros {
  item: PollListItem;
}

const Poll = ({ item }: IPollPros) => {
  const { t } = useTranslation();
  return (
    <div className="poll-item border border-solid border-primaryColor/70 p-2 rounded-lg mb-4 transition ease-in hover:shadow-md">
      <div className="poll-title text-lg font-bold text-primaryColor capitalize">
        {item.question}
      </div>
      <TotalResponses pollId={item.id} />
      <div className="status">
        {item.is_running ? t('polls.poll-running') : t('polls.poll-closed')}
      </div>
      <MyVoteStatus pollId={item.id} />
    </div>
  );
};

export default Poll;
