import React, { useEffect, useState } from 'react';
import { useGetUserSelectedOptionQuery } from '../../../store/services/pollsApi';
import { store } from '../../../store';

interface IMyVoteStatusProps {
  pollId: string;
}
const MyVoteStatus = ({ pollId }: IMyVoteStatusProps) => {
  const { data, isLoading } = useGetUserSelectedOptionQuery({
    pollId,
    userId: store.getState().session.currentUser?.userId || '',
  });
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoading && data) {
      if ((data as any).status) {
        setHasVoted((data as any).voted);
      }
    }
  }, [data, isLoading]);

  return <div className="">{hasVoted ? 'You voted' : 'Not voted'}</div>;
};

export default MyVoteStatus;
