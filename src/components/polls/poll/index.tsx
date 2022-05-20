import React from 'react';
import { PollListItem } from '../../../store/services/pollsApiTypes';
import TotalResponses from './totalResponses';
import MyVoteStatus from './myVoteStatus';

interface IPollPros {
  item: PollListItem;
}

const Poll = ({ item }: IPollPros) => {
  return (
    <div className="">
      <div className="">{item.question}</div>
      <TotalResponses pollId={item.id} />
      <div className="">{item.is_published ? 'published' : 'running'}</div>
      <MyVoteStatus pollId={item.id} />
    </div>
  );
};

export default Poll;
