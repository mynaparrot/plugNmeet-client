import React, { useMemo } from 'react';

import { useGetPollListsQuery } from '../../store/services/pollsApi';
import Poll from './poll';
import { store } from '../../store';

const ListPolls = () => {
  const { data } = useGetPollListsQuery();
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;

  const sortedPolls = useMemo(() => {
    if (data && data.polls !== null) {
      const sortedPolls = data.polls.slice();
      sortedPolls.sort((a, b) => b.created - a.created);
      return sortedPolls;
    }
  }, [data]);

  const renderPolls = () => {
    return sortedPolls?.map((p) => {
      return <Poll key={p.id} item={p} />;
    });
  };

  return (
    <div
      className={`polls-list-wrapper  overflow-auto scrollBar px-2 pt-2 xl:pt-3
      ${isAdmin ? 'h-[calc(100%-48px)]' : 'h-full'}`}
    >
      <div className="polls-list-wrap-inner">{renderPolls()}</div>
    </div>
  );
};

export default ListPolls;
