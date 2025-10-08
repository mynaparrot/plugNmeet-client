import React, { useMemo } from 'react';

import { useGetPollListsQuery } from '../../store/services/pollsApi';
import PollItem from './pollItem';
import { LoadingIcon } from '../../assets/Icons/Loading';

const PollsList = () => {
  const { currentData: data, isFetching } = useGetPollListsQuery();

  const polls = useMemo(() => {
    if (data && data.polls) {
      const sortedPolls = data.polls.slice();
      sortedPolls.sort((a, b) => Number(b.created) - Number(a.created));
      return sortedPolls;
    }
    return [];
  }, [data]);

  return (
    <div className="polls-list-wrapper relative overflow-auto scrollBar px-3 3xl:px-5 pt-2 xl:pt-3 h-[calc(100vh-220px)] 3xl:h-[calc(100vh-277px)]">
      <div className="polls-list-wrap-inner grid gap-4">
        {polls.map((poll, index) => (
          <PollItem
            key={poll.id}
            item={poll}
            serialNum={polls.length - index}
          />
        ))}
        {isFetching && (
          <div className="absolute text-center top-1/2 -translate-y-1/2 z-999 left-0 right-0 m-auto">
            <LoadingIcon
              className={'inline w-10 h-10 me-3 text-Gray-200 animate-spin'}
              fillColor={'#004D90'}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PollsList;
