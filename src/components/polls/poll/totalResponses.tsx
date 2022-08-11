import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useGetCountTotalResponsesQuery } from '../../../store/services/pollsApi';

interface ITotalResponsesProps {
  pollId: string;
}
const TotalResponses = ({ pollId }: ITotalResponsesProps) => {
  const { data, isLoading } = useGetCountTotalResponsesQuery(pollId);
  const [total, setTotal] = useState<number>(0);
  const { t } = useTranslation();

  useEffect(() => {
    if (!isLoading && data) {
      if (data.status) {
        setTotal(Number(data.totalResponses) ?? 0);
      }
    }
  }, [data, isLoading]);

  return (
    <div className="total-vote rounded-bl-lg bg-secondaryColor absolute top-0 right-0 text-white text-[10px] py-1 px-3 uppercase">
      <strong>{t('polls.total')}: </strong> {total}
    </div>
  );
};

export default TotalResponses;
