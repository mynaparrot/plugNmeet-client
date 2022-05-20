import React, { useEffect, useState } from 'react';

import { useGetPollListsQuery } from '../../store/services/pollsApi';
import { PollListItem } from '../../store/services/pollsApiTypes';
import Poll from './poll';

const ListPolls = () => {
  const { data, isLoading } = useGetPollListsQuery();
  const [polls, setPolls] = useState<PollListItem[]>([]);

  useEffect(() => {
    if (!isLoading && data) {
      if ((data as any).status) {
        setPolls((data as any).polls);
      }
    }
  }, [data, isLoading]);

  const renderPolls = () => {
    return polls.map((p) => {
      return <Poll key={p.id} item={p} />;
    });
  };

  return <div className="m-10">{renderPolls()}</div>;
};

export default ListPolls;
