import React, { useEffect, useState } from 'react';

import { useGetCountTotalResponsesQuery } from '../../../store/services/pollsApi';

interface ITotalResponsesProps {
  pollId: string;
}
const TotalResponses = ({ pollId }: ITotalResponsesProps) => {
  const { data, isLoading } = useGetCountTotalResponsesQuery(pollId);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    if (!isLoading && data) {
      if ((data as any).status) {
        setTotal((data as any).total_responses);
      }
    }
  }, [data, isLoading]);

  return <div className="total-vote">Total {total}</div>;
};

export default TotalResponses;
