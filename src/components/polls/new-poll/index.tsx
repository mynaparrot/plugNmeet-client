import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PollInfo } from 'plugnmeet-protocol-js';

import { store } from '../../../store';
import TopMenu from './topMenu';
import PollForm from './voteForm';
import { useGetPollResponsesDetailsQuery } from '../../../store/services/pollsApi';
import { PollDataWithOption } from '../utils';
import DetailsModal from './details';

interface PollItemProps {
  item: PollInfo;
  index: number;
}

const PollItem = ({ item, index }: PollItemProps) => {
  const { t } = useTranslation();
  const currenUser = store.getState().session.currentUser;
  const [viewDetails, setViewDetails] = useState<boolean>(false);
  const [pollDataWithOption, setPollDataWithOption] =
    useState<PollDataWithOption>();

  const { data: pollResponses } = useGetPollResponsesDetailsQuery(item.id);

  useMemo(() => {
    const obj: PollDataWithOption = {
      options: {},
      pollId: item.id,
      question: item.question,
      totalRespondents: 0,
      allRespondents: [],
    };

    for (let i = 0; i < item.options.length; i++) {
      const option = item.options[i];
      const pollDataOption = {
        id: option.id,
        text: option.text,
        responsesPercentage: 0,
        respondents: [],
      };
      if (pollResponses && pollResponses.responses) {
        const count = Number(pollResponses.responses[`${option.id}_count`]);
        if (count > 0) {
          const total = Number(pollResponses.responses.total_resp);
          pollDataOption.responsesPercentage = (count / total) * 100;
        }
      }
      obj.options[option.id] = pollDataOption;
    }

    if (pollResponses && pollResponses.responses) {
      if (pollResponses.responses.all_respondents) {
        const respondents: Array<string> = JSON.parse(
          pollResponses.responses.all_respondents,
        );
        for (let i = 0; i < respondents.length; i++) {
          const r = respondents[i];
          const data = r.split(':');
          obj.options[data[1]].respondents.push(data[2]);
          obj.allRespondents.push(data[0]);
        }
      }
      obj.totalRespondents = Number(pollResponses.responses.total_resp);
    }
    setPollDataWithOption(obj);
  }, [item, pollResponses]);

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
          {!pollDataWithOption ? null : (
            <PollForm
              pollDataWithOption={pollDataWithOption}
              isRunning={item.isRunning}
            />
          )}
        </div>
        <div className="bottom-wrap flex items-center justify-between gap-3 mt-4">
          <div className="total-vote text-sm text-Gray-700">
            {t('polls.total', {
              count: pollDataWithOption?.totalRespondents ?? 0,
            })}
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
              {!viewDetails || !pollDataWithOption ? null : (
                <DetailsModal
                  onCloseViewDetails={() => setViewDetails(false)}
                  pollDataWithOption={pollDataWithOption}
                  isRunning={item.isRunning}
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
