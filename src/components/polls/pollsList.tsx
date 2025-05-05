import React, { useMemo, useState } from 'react';
import { PollInfo } from 'plugnmeet-protocol-js';

import { useGetPollListsQuery } from '../../store/services/pollsApi';
import PollItem from './pollItem';
// import { store, useAppSelector } from '../../store';

const PollsList = () => {
  // const screenHeight = useAppSelector(
  //   (state) => state.bottomIconsActivity.screenHeight,
  // );
  const { currentData: data, isFetching } = useGetPollListsQuery();
  // const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;
  const [polls, setPolls] = useState<PollInfo[]>([]);

  useMemo(() => {
    if (data && data.polls) {
      const sortedPolls = data.polls.slice();
      sortedPolls.sort((a, b) => Number(b.created) - Number(a.created));
      setPolls(sortedPolls);
    }
  }, [data]);

  return (
    <div
      className="polls-list-wrapper relative overflow-auto scrollBar px-3 3xl:px-5 pt-2 xl:pt-3 h-[calc(100vh-277px)]"
      //style={{ height: isAdmin ? screenHeight - 200 : screenHeight - 150 }}
    >
      <div className="polls-list-wrap-inner">
        {polls.map((poll, index) => (
          <PollItem key={poll.id} item={poll} index={index} />
        ))}
        {isFetching ? (
          <div className="loading absolute text-center top-1/2 -translate-y-1/2 z-[999] left-0 right-0 m-auto">
            <div className="lds-ripple">
              <div className="border-secondaryColor" />
              <div className="border-secondaryColor" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PollsList;
