import React, { ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import clsx from 'clsx';

import { getFormatedRespondents, PollDataWithOption } from '../../utils';
import { CheckMarkIconSVG } from '../../../../assets/Icons/CheckMarkIconSVG';

interface RespondentsProps {
  pollDataWithOption: PollDataWithOption;
}

const Respondents = ({ pollDataWithOption }: RespondentsProps) => {
  const { t } = useTranslation();

  const optionDisclosures = useMemo(() => {
    const elms: Array<ReactElement> = [];
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
                  <div className="wrap relative rounded-xl overflow-auto">
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
        <div className="wrap grid gap-3">{optionDisclosures}</div>
      </div>
    </div>
  );
};

export default Respondents;
