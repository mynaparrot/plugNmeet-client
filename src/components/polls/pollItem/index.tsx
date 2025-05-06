import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PollInfo } from 'plugnmeet-protocol-js';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';

import { store } from '../../../store';
import TopMenu from './topMenu';
import PollForm from './voteForm';
import {
  useGetPollResponsesDetailsQuery,
  useGetPollResponsesResultQuery,
} from '../../../store/services/pollsApi';
import { PollDataWithOption } from '../utils';
import DetailsModal from './details';

interface PollItemProps {
  item: PollInfo;
  serialNum: number;
}

const PollItem = ({ item, serialNum }: PollItemProps) => {
  const { t } = useTranslation();
  const currenUser = store.getState().session.currentUser;
  const [viewDetails, setViewDetails] = useState<boolean>(false);
  const [pollDataWithOption, setPollDataWithOption] =
    useState<PollDataWithOption>();

  // to load data with details, valid for admin
  const [skipGetPollResponsesDetails, setSkipGetPollResponsesDetails] =
    useState<boolean>(true);
  const { data: pollDetailsResponses } = useGetPollResponsesDetailsQuery(
    item.id,
    {
      skip: skipGetPollResponsesDetails,
    },
  );

  // load only the results for all other users
  const [skipGetPollResult, setSkipGetPollResult] = useState<boolean>(true);
  const { data: pollResponsesResult } = useGetPollResponsesResultQuery(
    item.id,
    {
      skip: skipGetPollResult,
    },
  );

  useEffect(() => {
    if (currenUser?.metadata?.isAdmin) {
      setSkipGetPollResponsesDetails(false);
    } else {
      if (!item.isRunning) {
        // result only can receive if this poll closed
        setSkipGetPollResult(false);
      }
    }
    //eslint-disable-next-line
  }, [item.isRunning]);

  // for admin with details
  useMemo(() => {
    // for all users, we'll need to build option
    // otherwise non-admin user won't see poll's options
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
      if (pollDetailsResponses && pollDetailsResponses.responses) {
        const count = Number(
          pollDetailsResponses.responses[`${option.id}_count`],
        );
        if (count > 0) {
          const total = Number(pollDetailsResponses.responses.total_resp);
          pollDataOption.responsesPercentage = (count / total) * 100;
        }
      }
      obj.options[option.id] = pollDataOption;
    }

    if (pollDetailsResponses && pollDetailsResponses.responses) {
      if (pollDetailsResponses.responses.all_respondents) {
        const respondents: Array<string> = JSON.parse(
          pollDetailsResponses.responses.all_respondents,
        );
        for (let i = 0; i < respondents.length; i++) {
          const r = respondents[i];
          // format => userId:optionSelected:name
          const data = r.split(':');
          obj.options[data[1]].respondents.push({
            userId: data[0],
            name: data[2],
          });
          obj.allRespondents.push({
            userId: data[0],
            name: data[2],
          });
        }
      }
      obj.totalRespondents = Number(pollDetailsResponses.responses.total_resp);
    }
    setPollDataWithOption(obj);
  }, [item, pollDetailsResponses]);

  // for all other users with limited info
  useMemo(() => {
    if (!pollResponsesResult || !pollResponsesResult.pollResponsesResult) {
      return;
    }
    const result = pollResponsesResult.pollResponsesResult;
    const totalResponses = Number(result.totalResponses);

    const obj: PollDataWithOption = {
      options: {},
      pollId: item.id,
      question: item.question,
      totalRespondents: totalResponses,
      allRespondents: [],
    };

    const options = pollResponsesResult.pollResponsesResult.options;
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const pollDataOption = {
        id: Number(option.id),
        text: option.text,
        responsesPercentage: 0,
        respondents: [],
      };

      const voteCount = Number(option.voteCount);
      if (voteCount > 0) {
        pollDataOption.responsesPercentage = (voteCount / totalResponses) * 100;
      }
      obj.options[option.id] = pollDataOption;
    }
    setPollDataWithOption(obj);
  }, [item, pollResponsesResult]);

  const canViewTotal = () => {
    if (!item.isRunning) {
      return true;
    }
    return !!currenUser?.metadata?.isAdmin;
  };

  return (
    <>
      <div className="polls-item-inner bg-Gray-50 rounded-xl">
        <div className="head min-h-10 flex items-center justify-between w-full px-4 text-sm text-Gray-700 gap-3">
          <div className="left flex items-center gap-3">
            <span className="uppercase">
              {t('polls.poll-num', {
                index: serialNum,
              })}
            </span>
            {item.isRunning ? null : (
              <div className="border border-Red-200 bg-Red-100 shadow-buttonShadow rounded-full h-[22px] px-1.5 text-xs text-Red-700 font-medium flex items-center">
                {t('polls.poll-closed')}
              </div>
            )}
          </div>
          <div className="menu relative -mr-4">
            {!currenUser?.metadata?.isAdmin || !pollDataWithOption ? null : (
              <TopMenu
                isRunning={item.isRunning}
                setViewDetails={setViewDetails}
                pollDataWithOption={pollDataWithOption}
              />
            )}
          </div>
        </div>
        <div className="bg-white px-4 py-4 border border-Gray-200 shadow-buttonShadow rounded-xl">
          <Disclosure defaultOpen={true} as="div">
            {({ open }) => (
              <>
                <DisclosureButton className="flex items-center justify-between gap-3 w-full">
                  <label className="text-sm text-Gray-800 font-medium block">
                    {item.question}
                  </label>
                  <motion.div
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="rotate-180"
                    >
                      <path
                        d="M11.9999 10L7.99988 6L3.99988 10"
                        stroke="#7493B3"
                        strokeWidth="1.67"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                </DisclosureButton>

                <AnimatePresence>
                  {open && (
                    <DisclosurePanel
                      static
                      as={motion.div}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      // transition={{ duration: 0.2 }}
                      className=""
                    >
                      {!pollDataWithOption ? null : (
                        <PollForm
                          pollDataWithOption={pollDataWithOption}
                          isRunning={item.isRunning}
                        />
                      )}
                    </DisclosurePanel>
                  )}
                </AnimatePresence>
              </>
            )}
          </Disclosure>
          <div className="bottom-wrap flex items-center justify-between gap-3 mt-4">
            {canViewTotal() ? (
              <div className="total-vote text-sm text-Gray-700">
                {t('polls.total', {
                  count: pollDataWithOption?.totalRespondents ?? 0,
                })}
              </div>
            ) : null}
            {currenUser?.metadata?.isAdmin ? (
              <div>
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
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

export default PollItem;
