import React from 'react';
import { PollListItem } from '../../../store/services/pollsApiTypes';

interface IPollPros {
  item: PollListItem;
}

const Poll = ({ item }: IPollPros) => {
  return (
    <div className="">
      <div className="">{item.question}</div>
      <div className="">Total response: {item.total_responses}</div>
      <div className="">{item.is_published ? 'published' : 'running'}</div>
      <div className="">{item.voted ? 'You voted' : "You didn't vote"}</div>
    </div>
  );
};

export default Poll;
