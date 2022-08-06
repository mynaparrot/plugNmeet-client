import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useGetUserSelectedOptionQuery } from '../../../store/services/pollsApi';
import { store } from '../../../store';
import VoteForm from '../voteForm';

interface IMyVoteStatusProps {
  pollId: string;
}
const MyVoteStatus = ({ pollId }: IMyVoteStatusProps) => {
  const { t } = useTranslation();
  const { data, isLoading } = useGetUserSelectedOptionQuery({
    pollId,
    userId: store.getState().session.currentUser?.userId || '',
  });
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [showVoteForm, setShowVoteForm] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoading && data) {
      if (data.status) {
        setHasVoted(!!(data.voted && data.voted > 0));
      }
    }
  }, [data, isLoading]);

  const vote = () => {
    setShowVoteForm(true);
  };

  const onCloseForm = () => {
    setShowVoteForm(false);
  };

  return (
    <>
      <div className="has-voted">
        {hasVoted ? (
          <p className="absolute left-2 bottom-2 text-xs dark:text-white">
            {t('polls.you-voted')}
          </p>
        ) : (
          <button
            className="absolute left-0 bottom-0 transition ease-in bg-primaryColor hover:bg-secondaryColor text-[10px] text-white pt-1 pb-[2px] px-3 uppercase rounded-tr-lg"
            onClick={() => vote()}
          >
            {t('polls.vote')}
          </button>
        )}
      </div>
      {showVoteForm ? (
        <VoteForm onCloseForm={onCloseForm} pollId={pollId} />
      ) : null}
    </>
  );
};

export default MyVoteStatus;
