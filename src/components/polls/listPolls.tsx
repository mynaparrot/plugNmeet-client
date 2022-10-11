import React, { useMemo } from 'react';

import { useGetPollListsQuery } from '../../store/services/pollsApi';
import Poll from './poll';
import { store } from '../../store';

const ListPolls = () => {
  const { data, isLoading } = useGetPollListsQuery();
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;

  const sortedPolls = useMemo(() => {
    if (data && data.polls) {
      const sortedPolls = data.polls.slice();
      sortedPolls.sort((a, b) => Number(b.created) - Number(a.created));
      return sortedPolls;
    }
  }, [data]);

  const renderPolls = useMemo(() => {
    return sortedPolls?.map((p) => {
      return <Poll key={p.id} item={p} />;
    });
  }, [sortedPolls]);

  return (
    <div
      className={`polls-list-wrapper relative overflow-auto scrollBar px-2 pt-2 xl:pt-3
      ${isAdmin ? 'h-[calc(100%-48px)]' : 'h-full'}`}
    >
      <div className="polls-list-wrap-inner">
        {renderPolls}
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
