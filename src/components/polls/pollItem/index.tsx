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
import PollActionsMenu from './pollActionsMenu';
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
  const isAdmin = useMemo(
    () => !!store.getState().session.currentUser?.metadata?.isAdmin,
    [],
  );
  const [viewDetails, setViewDetails] = useState<boolean>(false);

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
    if (isAdmin) {
      setSkipGetPollResponsesDetails(false);
    } else {
      if (!item.isRunning) {
        // result only can receive if this poll closed
        setSkipGetPollResult(false);
      }
    }
  }, [item.isRunning, isAdmin]);

  const pollDataWithOption = useMemo((): PollDataWithOption | undefined => {
    // Base object, crucial for all users to see the options text.
    const baseObj: PollDataWithOption = {
      options: {},
      pollId: item.id,
      question: item.question,
      totalRespondents: 0,
      allRespondents: [],
    };

    for (const option of item.options) {
      baseObj.options[option.id] = {
        id: option.id,
        text: option.text,
        responsesPercentage: 0,
        respondents: [],
      };
    }

    // Layer on admin-specific details if available
    if (isAdmin && pollDetailsResponses?.responses) {
      const details = pollDetailsResponses.responses;
      baseObj.totalRespondents = Number(details.total_resp);

      for (const option of item.options) {
        const count = Number(details[`${option.id}_count`] ?? 0);
        if (count > 0 && baseObj.totalRespondents > 0) {
          baseObj.options[option.id].responsesPercentage = Math.round(
            (count / baseObj.totalRespondents + Number.EPSILON) * 100,
          );
        }
      }

      if (details.all_respondents) {
        try {
          const respondents: Array<string> = JSON.parse(
            details.all_respondents,
          );
          for (const r of respondents) {
            // format => userId:optionSelected:name
            const data = r.split(':');
            if (data.length === 3 && baseObj.options[data[1]]) {
              const respondent = { userId: data[0], name: data[2] };
              baseObj.options[data[1]].respondents.push(respondent);
              baseObj.allRespondents.push(respondent);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      return baseObj;
    }

    // Layer on public results if available (for non-admins after poll ends)
    if (pollResponsesResult?.pollResponsesResult) {
      const result = pollResponsesResult.pollResponsesResult;
      const totalResponses = Number(result.totalResponses);
      baseObj.totalRespondents = totalResponses;

      for (const option of result.options) {
        if (baseObj.options[option.id]) {
          const voteCount = Number(option.voteCount);
          if (voteCount > 0 && totalResponses > 0) {
            baseObj.options[option.id].responsesPercentage = Math.round(
              (voteCount / totalResponses + Number.EPSILON) * 100,
            );
          }
        }
      }
      return baseObj;
    }

    // For a non-admin during a running poll, no results are available yet,
    // but the base object with options is still returned, allowing them to vote.
    if (!isAdmin && item.isRunning) {
      return baseObj;
    }

    // Fallback if no data is available at all.
    return baseObj;
  }, [item, pollDetailsResponses, pollResponsesResult, isAdmin]);

  const canViewTotal = () => {
    if (!item.isRunning) {
      return true;
    }
    return isAdmin;
  };

  return (
    <div className="polls-item-inner bg-Gray-50 rounded-xl">
      <div className="head min-h-10 flex items-center justify-between w-full px-4 text-sm text-Gray-700 gap-3">
        <div className="left flex items-center gap-3">
          <span className="uppercase">
            {t('polls.poll-num', {
              index: serialNum,
            })}
          </span>
          {item.isRunning ? null : (
            <div className="border border-Red-200 bg-Red-100 shadow-button-shadow rounded-full h-[22px] px-1.5 text-xs text-Red-700 font-medium flex items-center">
              {t('polls.poll-closed')}
            </div>
          )}
        </div>
        <div className="menu relative -mr-4">
          {isAdmin && pollDataWithOption && (
            <PollActionsMenu
              isRunning={item.isRunning}
              setViewDetails={setViewDetails}
              pollDataWithOption={pollDataWithOption}
            />
          )}
        </div>
      </div>
      <div className="bg-white px-4 py-4 border border-Gray-200 shadow-button-shadow rounded-xl">
        <Disclosure defaultOpen={true} as="div">
          {({ open }) => (
            <>
              <DisclosureButton className="flex items-center justify-between gap-3 w-full cursor-pointer">
                <span className="text-sm text-Gray-800 font-medium block">
                  {item.question}
                </span>
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
                    {pollDataWithOption && (
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
          {canViewTotal() && (
            <div className="total-vote text-sm text-Gray-700">
              {t('polls.total-responses', {
                count: pollDataWithOption?.totalRespondents ?? 0,
              })}
            </div>
          )}
          {isAdmin && (
            <div>
              <button
                type="button"
                onClick={() => setViewDetails(true)}
                className="view-details h-8 px-3 bg-Gray-50 rounded-[11px] text-sm text-Gray-800 font-semibold flex items-center hover:bg-Gray-100 transition-all duration-300 cursor-pointer"
              >
                {t('polls.view-details')}
              </button>
              {viewDetails && pollDataWithOption && (
                <DetailsModal
                  onCloseViewDetails={() => setViewDetails(false)}
                  pollDataWithOption={pollDataWithOption}
                  isRunning={item.isRunning}
                  serialNum={serialNum}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollItem;
