import React, { ReactElement } from 'react';
import { chunk } from 'es-toolkit';
import ReactDOMServer from 'react-dom/server';

import { getNatsConn } from '../../helpers/nats';
import i18n from '../../helpers/i18n';
import { generateAvatarInitial } from '../../helpers/utils';

export interface PollDataWithOption {
  pollId: string;
  question: string;
  options: {
    [key: string]: PollDataOption;
  };
  totalRespondents: number;
  totalVotes: number;
  isAnonymous: boolean;
  isMultiple: boolean;
  isQuiz: boolean;
  expiresAt: number;
  allRespondents: Respondents[];
}

interface PollDataOption {
  id: number;
  text: string;
  votes: number;
  isCorrect: boolean;
  responsesPercentage: number;
  respondents: Respondents[];
}

export interface Respondents {
  userId: string;
  name: string;
}

const RespondentItem = ({ user }: { user: Respondents }) => {
  const initials = generateAvatarInitial(user.name);

  return (
    <p
      className="text-xs w-[156.5px] font-medium text-Gray-800 dark:text-white flex items-center gap-1 px-[14px]"
      key={user.userId}
    >
      <span className="w-[18px] h-[18px] rounded-md bg-Blue2-700 dark:bg-dark-secondary2 flex items-center justify-center text-white text-[8px] font-medium">
        {initials}
      </span>
      {user.name}
    </p>
  );
};

export const getFormatedRespondents = (respondents: Respondents[]) => {
  const elms: Array<ReactElement> = [];
  const respondentChunks = chunk(respondents, 10);

  respondentChunks.forEach((users, i) => {
    elms.push(
      <div
        className="grid gap-2 content-start border-e border-Gray-300 dark:border-Gray-800 py-2 w-max last:border-none"
        key={`chunk-${i}`}
      >
        {users.map((user) => (
          <RespondentItem key={user.userId} user={user} />
        ))}
      </div>,
    );
  });

  if (elms.length < 4) {
    const blank = 4 - elms.length;
    for (let j = 0; j < blank; j++) {
      elms.push(<div className="grid gap-2" key={`blank-${j}`}></div>);
    }
  }
  return elms;
};

export const publishPollResultByChat = async (
  pollDataWithOption: PollDataWithOption,
) => {
  const conn = getNatsConn();
  // Aggregate counts only (votes), so no voter names can ever leak for anonymous polls.
  const hasTotals = pollDataWithOption.totalRespondents > 0;
  const formattedOptions = Object.values(pollDataWithOption.options).map(
    (option) => (
      <span className="mt-1.5 block" key={option.id}>
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 break-words text-start">
            {pollDataWithOption.isQuiz && option.isCorrect && (
              <span className="me-1 font-medium text-Green-700">✓</span>
            )}
            {option.text}
          </span>
          <span
            className="shrink-0 text-xs text-Gray-700 dark:text-dark-text"
            dir="ltr"
          >
            {option.votes}
            {hasTotals ? ` (${option.responsesPercentage}%)` : ''}
          </span>
        </span>
      </span>
    ),
  );

  const elm = ReactDOMServer.renderToString(
    // Phrasing tags only (span/strong): block tags would break out of the chat
    // bubble's <p> wrapper, so the card is built from styled spans instead.
    <>
      <span className="block text-xs font-medium text-Gray-600 dark:text-dark-text">
        {i18n.t('polls.view-result-title')}
      </span>
      <strong className="block break-words text-sm font-semibold text-Gray-950 dark:text-white">
        {pollDataWithOption.question}
      </strong>
      {formattedOptions}
      <span className="mt-2 block border-t border-Gray-200 pt-2 text-xs text-Gray-600 dark:border-Gray-700 dark:text-dark-text">
        {pollDataWithOption.isMultiple
          ? i18n.t('polls.total-votes', {
              votes: pollDataWithOption.totalVotes,
              count: pollDataWithOption.totalRespondents,
            })
          : i18n.t('polls.total-responses', {
              count: pollDataWithOption.totalRespondents,
            })}
      </span>
    </>,
  );
  if (conn) {
    await conn.sendChatMsg('public', elm);
  }
};
