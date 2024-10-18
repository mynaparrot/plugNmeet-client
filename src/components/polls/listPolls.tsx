import React, { useEffect, useState } from 'react';
import useVirtual from 'react-cool-virtual';
import { PollInfo } from 'plugnmeet-protocol-js';

import { useGetPollListsQuery } from '../../store/services/pollsApi';
import Poll from './poll';
import { store, useAppSelector } from '../../store';

const ListPolls = () => {
  const screenHeight = useAppSelector(
    (state) => state.bottomIconsActivity.screenHeight,
  );
  const { data, isLoading } = useGetPollListsQuery();
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;
  const [polls, setPolls] = useState<PollInfo[]>([]);
  const { outerRef, innerRef, items } = useVirtual({
    itemCount: polls.length,
  });

  useEffect(() => {
    if (data && data.polls) {
      const sortedPolls = data.polls.slice();
      sortedPolls.sort((a, b) => Number(b.created) - Number(a.created));
      setPolls(sortedPolls);
    }
  }, [data]);

  const renderPoll = (index) => {
    if (!polls.length || typeof polls[index] === 'undefined') {
      return null;
    }
    const poll = polls[index];
    return <Poll key={poll.id} item={poll} />;
  };

  return (
    <div
      className="polls-list-wrapper relative overflow-auto scrollBar px-2 pt-2 xl:pt-3"
      style={{ height: isAdmin ? screenHeight - 200 : screenHeight - 150 }}
      ref={outerRef as any}
    >
      <div className="polls-list-wrap-inner" ref={innerRef as any}>
        {items.map(({ index, measureRef }) => (
          <div
            key={index}
            ref={measureRef}
            className="poll-item relative overflow-hidden border border-solid border-primaryColor/70 px-2 py-8 rounded-lg mb-4 transition ease-in hover:shadow-md"
          >
            {renderPoll(index)}
          </div>
        ))}
        {isLoading ? (
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

export default ListPolls;
