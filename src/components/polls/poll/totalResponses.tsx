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
      if (data.status) {
        setTotal(data.total_responses ?? 0);
      }
    }
  }, [data, isLoading]);

  return (
    <div className="total-vote rounded-bl-lg bg-secondaryColor absolute top-0 right-0 text-white text-[10px] py-1 px-3 uppercase">
      <strong>Total: </strong> {total}
    </div>
  );
};

export default TotalResponses;
