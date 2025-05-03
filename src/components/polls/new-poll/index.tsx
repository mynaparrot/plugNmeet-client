import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PollInfo } from 'plugnmeet-protocol-js';

import { store } from '../../../store';
import TopMenu from './topMenu';
import PollForm from './voteForm';
import ViewDetails from '../viewDetails';

interface Props {
  item: PollInfo;
  index: number;
}

const PollItem = ({ item, index }: Props) => {
  const { t } = useTranslation();
  const currenUser = store.getState().session.currentUser;
  const [viewDetails, setViewDetails] = useState<boolean>(false);

  return (
    <>
      <div className="polls-item-inner">
        <div className="head min-h-10 flex items-center justify-between w-full px-4 text-sm text-Gray-700 gap-3">
          <div className="left flex items-center gap-3">
            <span className="uppercase">
              {t('polls.poll-num', {
                index: index + 1,
              })}
            </span>
            {item.isRunning ? null : (
              <div className="border border-Red-200 bg-Red-100 shadow-buttonShadow rounded-full h-[22px] px-1.5 text-xs text-Red-700 font-medium flex items-center">
                {t('polls.poll-closed')}
              </div>
            )}
          </div>
          <div className="menu relative -mr-4">
            <TopMenu itemId={item.id} isRunning={item.isRunning} />
          </div>
        </div>
        <div className="bg-white px-4 py-4 border border-Gray-200 shadow-buttonShadow rounded-xl">
          <PollForm
            pollId={item.id}
            options={item.options}
            isRunning={item.isRunning}
          />
        </div>
        <div className="bottom-wrap flex items-center justify-between gap-3 mt-4">
          <div className="total-vote text-sm text-Gray-700">
            Total Votes: 42/66
          </div>
          {currenUser?.metadata?.isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => setViewDetails(true)}
                className="view-details h-8 px-3 bg-Gray-50 rounded-[11px] text-sm text-Gray-800 font-semibold flex items-center hover:bg-Gray-100 transition-all duration-300 cursor-pointer"
              >
                {t('polls.view-details')}
              </button>
              {!viewDetails ? null : (
                <ViewDetails
                  onCloseViewDetails={() => setViewDetails(false)}
                  pollId={item.id}
                  item={item}
                />
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default PollItem;
