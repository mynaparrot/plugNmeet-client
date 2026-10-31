import React, { ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import clsx from 'clsx';

import { getFormatedRespondents, PollDataWithOption } from '../../utils';
import { CheckMarkIconSVG } from '../../../../assets/Icons/CheckMarkIconSVG';
import { generateAvatarInitial } from '../../../../helpers/utils';

interface RespondentsProps {
  pollDataWithOption: PollDataWithOption;
}

const Respondents = ({ pollDataWithOption }: RespondentsProps) => {
  const { t } = useTranslation();

  const optionDisclosures = useMemo(() => {
    const elms: Array<ReactElement> = [];
    // text answers are listed per answer/respondent instead of per option
    if (pollDataWithOption.isTextAnswer) {
      return elms;
    }
    for (const key in pollDataWithOption.options) {
      const o = pollDataWithOption.options[key];
      const elm = (
        <Disclosure as="div" key={o.id}>
          {({ open }) => (
            <div className="bg-Gray-50 dark:bg-dark-secondary rounded-xl border border-gray-300 dark:border-Gray-800 overflow-hidden w-full">
              <DisclosureButton
                disabled={pollDataWithOption.isAnonymous}
                className={`flex items-center ${pollDataWithOption.isAnonymous ? '' : 'cursor-pointer'} justify-between gap-3 w-full ps-[14px] pe-2 bg-white dark:bg-dark-secondary3 min-h-9 rounded-xl  shadow-button-shadow dark:shadow-none transition-all duration-300 ${open ? 'border-b border-Gray-300 dark:border-Gray-800' : ''}`}
              >
                <span className="text-sm text-Gray-800 dark:text-white min-w-0 flex-1 overflow-hidden break-all text-start">
                  {o.text} ({o.votes})
                  {pollDataWithOption.isQuiz && o.isCorrect && (
                    <span className="ms-2 inline-flex items-center align-middle">
                      <CheckMarkIconSVG />
                    </span>
                  )}
                </span>
                <div className="right flex items-center gap-2 shrink-0">
                  <span className="text-xs text-Gray-700 dark:text-dark-text">
                    ({o.responsesPercentage + '%'})
                  </span>
                  {!pollDataWithOption.isAnonymous && (
                    <div
                      className={clsx('transition-transform duration-200', open && 'rotate-180')}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="17"
                        viewBox="0 0 16 17"
                        fill="none"
                      >
                        <path d="M12 6.5L8 10.5L4 6.5" fill="#7493B3" />
                        <path
                          d="M12 6.5L8 10.5L4 6.5H12Z"
                          stroke="#7493B3"
                          strokeWidth="1.67"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </DisclosureButton>

              {/* Polls created as anonymous can never be opened, so no respondent
                  name is rendered. `transition` keeps the panel mounted until the
                  collapse finishes; the grid rows trick animates the height. */}
              <DisclosurePanel
                transition
                className="grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-200 ease-out data-closed:grid-rows-[0fr] data-closed:opacity-0"
              >
                <div className="overflow-hidden">
                  <div className="wrap relative rounded-xl overflow-auto max-h-48 scrollBar scrollBar2">
                    <div className="inner flex">{getFormatedRespondents(o.respondents)}</div>
                  </div>
                </div>
              </DisclosurePanel>
            </div>
          )}
        </Disclosure>
      );
      elms.push(elm);
    }
    return elms;
  }, [pollDataWithOption]);

  return (
    <div className="px-5 py-5">
      <p className="text-sm font-medium text-Gray-800 dark:text-dark-text mb-4">
        {pollDataWithOption.isMultiple
          ? t('polls.total-votes', {
              votes: pollDataWithOption.totalVotes,
              count: pollDataWithOption.totalRespondents,
            })
          : t('polls.total-responses', {
              count: pollDataWithOption.totalRespondents,
            })}
      </p>
      <div className="relative">
        {pollDataWithOption.isTextAnswer ? (
          <div className="wrap grid gap-2.5 max-h-64 overflow-y-auto scrollBar scrollBar2 pe-1 content-start">
            {pollDataWithOption.isAnonymous
              ? Object.values(pollDataWithOption.options).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-start justify-between gap-2 bg-Gray-50 dark:bg-dark-secondary rounded-xl border border-Gray-200 dark:border-Gray-800 px-3.5 py-2.5 text-sm"
                  >
                    <span
                      dir="auto"
                      className="text-Gray-900 dark:text-white min-w-0 flex-1 whitespace-pre-wrap break-words"
                    >
                      {o.text}
                    </span>
                    {o.votes > 1 && (
                      <span className="shrink-0 rounded-full bg-white dark:bg-dark-secondary3 border border-Gray-200 dark:border-Gray-700 px-2 py-0.5 text-xs font-semibold text-Gray-700 dark:text-white">
                        ×{o.votes}
                      </span>
                    )}
                  </div>
                ))
              : pollDataWithOption.allRespondents.map((r) => (
                  <div
                    key={r.userId}
                    className="bg-Gray-50 dark:bg-dark-secondary rounded-xl border border-Gray-200 dark:border-Gray-800 px-3.5 py-2.5 grid gap-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 shrink-0 rounded-md bg-Blue2-700 dark:bg-dark-secondary2 flex items-center justify-center text-white text-[9px] font-semibold">
                        {generateAvatarInitial(r.name)}
                      </span>
                      <span className="text-xs font-semibold text-Gray-800 dark:text-white truncate">
                        {r.name}
                      </span>
                    </div>
                    <p
                      dir="auto"
                      className="text-sm text-Gray-900 dark:text-white whitespace-pre-wrap break-words bg-white dark:bg-dark-secondary3 rounded-lg px-3 py-2 border border-Gray-100 dark:border-Gray-800"
                    >
                      {r.textAnswer}
                    </p>
                  </div>
                ))}
          </div>
        ) : (
          <div className="wrap grid gap-3 max-h-64 overflow-y-auto scrollBar scrollBar2 pe-1">
            {optionDisclosures}
          </div>
        )}
      </div>
    </div>
  );
};

export default Respondents;
