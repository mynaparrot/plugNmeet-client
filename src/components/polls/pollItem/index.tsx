import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PollInfo } from 'plugnmeet-protocol-js';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import clsx from 'clsx';

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
  const isAdmin = useMemo(() => !!store.getState().session.currentUser?.metadata?.isAdmin, []);
  const [viewDetails, setViewDetails] = useState<boolean>(false);

  // to load data with details, valid for admin
  const [skipGetPollResponsesDetails, setSkipGetPollResponsesDetails] = useState<boolean>(true);
  const { data: pollDetailsResponses, refetch } = useGetPollResponsesDetailsQuery(item.id, {
    skip: skipGetPollResponsesDetails,
    pollingInterval: 30 * 1000,
  });

  // load only the results for all other users
  const [skipGetPollResult, setSkipGetPollResult] = useState<boolean>(true);
  const { data: pollResponsesResult } = useGetPollResponsesResultQuery(item.id, {
    skip: skipGetPollResult,
    pollingInterval: 30 * 1000,
  });

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
      totalVotes: 0,
      isAnonymous: item.isAnonymous,
      isMultiple: item.isMultiple,
      isQuiz: item.isQuiz,
      // expires_at is a JS_STRING int64 over the wire; Number() for the countdown
      expiresAt: Number(item.expiresAt ?? 0),
      allRespondents: [],
    };

    for (const option of item.options) {
      baseObj.options[option.id] = {
        id: option.id,
        text: option.text,
        votes: 0,
        // real is_correct is revealed by the server only once the poll is closed
        isCorrect: option.isCorrect,
        responsesPercentage: 0,
        respondents: [],
      };
    }

    // Layer on admin-specific details if available (typed responsesDetails)
    if (isAdmin && pollDetailsResponses?.responsesDetails) {
      const details = pollDetailsResponses.responsesDetails;
      baseObj.totalRespondents = Number(details.totalRespondents ?? 0);

      // protojson omits zero-valued scalars (e.g. voteCount: 0), so explicit ?? 0 guards NaN
      const counts = new Map(details.options.map((o) => [String(o.id), Number(o.voteCount ?? 0)]));
      for (const option of item.options) {
        const count = counts.get(String(option.id)) ?? 0;
        baseObj.options[option.id].votes = count;
        baseObj.totalVotes += count;
        if (count > 0 && baseObj.totalRespondents > 0) {
          baseObj.options[option.id].responsesPercentage = Math.round(
            (count / baseObj.totalRespondents + Number.EPSILON) * 100,
          );
        }
      }

      for (const r of details.respondents ?? []) {
        const respondent = { userId: r.userId, name: r.name };
        for (const id of r.optionIds ?? []) {
          if (baseObj.options[String(id)]) {
            baseObj.options[String(id)].respondents.push(respondent);
          }
        }
        baseObj.allRespondents.push(respondent);
      }
      return baseObj;
    }

    // Layer on public results if available (for non-admins after poll ends)
    if (pollResponsesResult?.pollResponsesResult) {
      const result = pollResponsesResult.pollResponsesResult;
      const totalResponses = Number(result.totalResponses ?? 0);
      baseObj.totalRespondents = totalResponses;
      baseObj.totalVotes = Number(result.totalVotes ?? 0);

      for (const option of result.options) {
        const target = baseObj.options[option.id];
        if (target) {
          const voteCount = Number(option.voteCount ?? 0);
          target.votes = voteCount;
          // closed polls reveal the correct answers here
          target.isCorrect = option.isCorrect;
          if (voteCount > 0 && totalResponses > 0) {
            target.responsesPercentage = Math.round(
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
    <div className="polls-item-inner bg-Gray-50 dark:bg-dark-secondary2 rounded-xl">
      <div className="head min-h-10 flex items-center justify-between w-full px-4 text-sm text-Gray-700 dark:text-white gap-3">
        <div className="left flex items-center gap-3">
          <span className="uppercase">
            {t('polls.poll-num', {
              index: serialNum,
            })}
          </span>
          {!item.isRunning && (
            <div className="border border-Red-200 bg-Red-100 shadow-button-shadow rounded-full h-[22px] px-1.5 text-xs text-Red-700 font-medium flex items-center">
              {t('polls.poll-closed')}
            </div>
          )}
        </div>
        <div className="menu relative -me-4">
          {isAdmin && pollDataWithOption && (
            <PollActionsMenu
              isRunning={item.isRunning}
              setViewDetails={setViewDetails}
              pollDataWithOption={pollDataWithOption}
            />
          )}
        </div>
      </div>
      <div className="bg-white dark:bg-dark-primary px-4 py-4 border border-Gray-200 dark:border-Gray-700 shadow-button-shadow dark:shadow-none rounded-xl">
        <Disclosure defaultOpen={item.isRunning} as="div">
          {({ open }) => (
            <>
              <DisclosureButton className="flex items-center justify-between gap-3 w-full cursor-pointer">
                <span className="text-sm text-Gray-800 dark:text-white font-medium block text-start min-w-0 flex-1 overflow-hidden break-all">
                  {item.question}
                </span>
                <div
                  className={clsx(
                    'shrink-0 group-hover:opacity-100 transition-[opacity,transform] duration-200 text-Gray-800 dark:text-white',
                    open && 'rotate-180',
                  )}
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
                      stroke="CurrentColor"
                      strokeWidth="1.67"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </DisclosureButton>

              {/* `transition` keeps the panel mounted until the collapse finishes;
                  the grid rows trick animates height without knowing the content size. */}
              <DisclosurePanel
                transition
                className="grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-200 ease-out data-closed:grid-rows-[0fr] data-closed:opacity-0"
              >
                <div className="overflow-hidden">
                  {pollDataWithOption && (
                    <PollForm pollDataWithOption={pollDataWithOption} isRunning={item.isRunning} />
                  )}
                </div>
              </DisclosurePanel>
            </>
          )}
        </Disclosure>
        <div className="bottom-wrap flex items-center justify-between gap-3 mt-4">
          {canViewTotal() && (
            <div className="total-vote text-sm text-Gray-700 dark:text-dark-text">
              {pollDataWithOption?.isMultiple
                ? t('polls.total-votes', {
                    votes: pollDataWithOption.totalVotes,
                    count: pollDataWithOption.totalRespondents,
                  })
                : t('polls.total-responses', {
                    count: pollDataWithOption?.totalRespondents ?? 0,
                  })}
            </div>
          )}
          {isAdmin && (
            <div>
              <button
                type="button"
                onClick={() => setViewDetails(true)}
                className="view-details h-8 px-3 bg-Gray-50 dark:bg-Gray-800 rounded-[11px] text-sm text-Gray-800 dark:text-white font-semibold flex items-center hover:bg-Gray-100 transition-all duration-300 cursor-pointer"
              >
                {t('polls.view-details')}
              </button>
              {viewDetails && pollDataWithOption && (
                <DetailsModal
                  onCloseViewDetails={() => setViewDetails(false)}
                  pollDataWithOption={pollDataWithOption}
                  isRunning={item.isRunning}
                  serialNum={serialNum}
                  refetch={refetch}
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
