import React, { useMemo } from 'react';

import { useGetPollListsQuery } from '../../store/services/pollsApi';
import Poll from './poll';

const ListPolls = () => {
  const { data } = useGetPollListsQuery();

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
    <div className="polls-list-wrapper h-[calc(100%-48px)] overflow-auto scrollBar px-2 xl:px-4 pt-2 xl:pt-5">
      <div className="polls-list-wrap-inner">{renderPolls()}</div>
    </div>
  );
};

export default ListPolls;
