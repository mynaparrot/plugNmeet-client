import React, { useState } from 'react';
import TotalResponses from './totalResponses';
import MyVoteStatus from './myVoteStatus';
import { useTranslation } from 'react-i18next';
import { store } from '../../../store';
import ViewDetails from '../viewDetails';
import ViewResult from '../viewResult';
import { PollInfo } from '../../../helpers/proto/plugnmeet_polls_pb';

interface IPollPros {
  item: PollInfo;
}

const Poll = ({ item }: IPollPros) => {
  const { t } = useTranslation();
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;
  const [viewDetails, setViewDetails] = useState<boolean>(false);
  const [viewResult, setViewResult] = useState<boolean>(false);

  return (
    <>
      <div className="poll-title text-md text-primaryColor dark:text-darkText">
        {item.question}
      </div>
      <TotalResponses pollId={item.id} />
      <div className="status absolute top-0 left-0 bg-secondaryColor text-[10px] text-white py-1 px-3 uppercase rounded-br-lg">
        {item.isRunning ? t('polls.poll-running') : t('polls.poll-closed')}
      </div>

      <div className="btn">
        {item.isRunning ? <MyVoteStatus pollId={item.id} /> : null}

        {isAdmin ? (
          <button
            onClick={() => setViewDetails(true)}
            className="absolute right-0 bottom-0 transition ease-in bg-primaryColor hover:bg-secondaryColor text-[10px] text-white pt-1 pb-[2px] px-3 uppercase rounded-tl-lg"
          >
            {t('polls.view-details')}
          </button>
        ) : null}

        {!isAdmin && !item.isRunning ? (
          <button
            onClick={() => setViewResult(true)}
            className="absolute right-0 bottom-0 transition ease-in bg-primaryColor hover:bg-secondaryColor text-[10px] text-white pt-1 pb-[2px] px-3 uppercase rounded-tl-lg"
          >
            {t('polls.view-result')}
          </button>
        ) : null}
      </div>

      <>
        {isAdmin && viewDetails ? (
          <ViewDetails
            onCloseViewDetails={() => setViewDetails(false)}
            pollId={item.id}
          />
        ) : null}

        {/*only if result published*/}
        {!isAdmin && !item.isRunning && viewResult ? (
          <ViewResult
            onCloseViewResult={() => setViewResult(false)}
            pollId={item.id}
          />
        ) : null}
      </>
    </>
  );
};

export default Poll;
