import React, { useState } from 'react';
import { PollListItem } from '../../../store/services/pollsApiTypes';
import TotalResponses from './totalResponses';
import MyVoteStatus from './myVoteStatus';
import { useTranslation } from 'react-i18next';
import { store } from '../../../store';
import ViewDetails from '../viewDetails';
import ViewResult from '../viewResult';

interface IPollPros {
  item: PollListItem;
}

const Poll = ({ item }: IPollPros) => {
  const { t } = useTranslation();
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;
  const [viewDetails, setViewDetails] = useState<boolean>(false);
  const [viewResult, setViewResult] = useState<boolean>(false);

  return (
    <div className="poll-item border border-solid border-primaryColor/70 p-2 rounded-lg mb-4 transition ease-in hover:shadow-md">
      <div className="poll-title text-lg font-bold text-primaryColor capitalize">
        {item.question}
      </div>
      <TotalResponses pollId={item.id} />
      <div className="status">
        {item.is_running ? t('polls.poll-running') : t('polls.poll-closed')}
      </div>
      <MyVoteStatus pollId={item.id} />
      {isAdmin ? (
        <button onClick={() => setViewDetails(true)}>
          {t('polls.view-details')}
        </button>
      ) : null}

      {!isAdmin && !item.is_running ? (
        <button onClick={() => setViewResult(true)}>
          {t('polls.view-result')}
        </button>
      ) : null}

      <>
        {isAdmin && viewDetails ? (
          <ViewDetails
            onCloseViewDetails={() => setViewDetails(false)}
            pollId={item.id}
          />
        ) : null}

        {/*only if result published*/}
        {!isAdmin && !item.is_running && viewResult ? (
          <ViewResult
            onCloseViewResult={() => setViewResult(false)}
            pollId={item.id}
          />
        ) : null}
      </>
    </div>
  );
};

export default Poll;
