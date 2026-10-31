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
  isTextAnswer: boolean;
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
  textAnswer?: string;
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

export const publishPollResultByChat = async (pollDataWithOption: PollDataWithOption) => {
  const conn = getNatsConn();
  // Aggregate counts only (votes), so no voter names can ever leak for anonymous polls.
  const hasTotals = pollDataWithOption.totalRespondents > 0;

  // Text answers read as quotes, not as options: a card with a start accent border
  // stays readable inside both the own-message and other-message chat bubbles.
  const formattedOptions = pollDataWithOption.isTextAnswer
    ? Object.values(pollDataWithOption.options).map((option) => (
        <span
          className="flex items-start justify-between gap-2 rounded-lg border border-s-4 border-Gray-200 border-s-Blue2-500 bg-white px-3 py-2 dark:border-Gray-700 dark:border-s-Blue2-400 dark:bg-dark-secondary"
          key={option.id}
        >
          <span
            dir="auto"
            className="min-w-0 flex-1 whitespace-pre-wrap break-words text-start text-sm text-Gray-900 dark:text-white"
          >
            {option.text}
          </span>
          {/* identical answers are grouped, so only duplicates need a count */}
          {option.votes > 1 && (
            <span
              className="shrink-0 rounded-full border border-Gray-200 bg-Gray-50 px-2 py-0.5 text-xs font-semibold text-Gray-700 dark:border-Gray-700 dark:bg-Gray-800 dark:text-white"
              dir="ltr"
            >
              ×{option.votes}
            </span>
          )}
        </span>
      ))
    : Object.values(pollDataWithOption.options).map((option) => (
        <span
          className="block rounded-lg bg-Gray-50 px-2.5 py-1.5 dark:bg-Gray-800"
          key={option.id}
        >
          <span className="flex items-start justify-between gap-2 min-w-0">
            <span className="min-w-0 flex-1 text-start text-sm text-Gray-950 dark:text-white overflow-hidden break-all">
              {pollDataWithOption.isQuiz && option.isCorrect && (
                <span className="me-1 rounded bg-Green-100 px-1.5 text-xs font-semibold text-Green-700 dark:bg-Green-900 dark:text-Green-300">
                  ✓
                </span>
              )}
              {option.text}
            </span>
            <span
              className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-Gray-700 dark:bg-Gray-700 dark:text-white"
              dir="ltr"
            >
              {option.votes}
              {hasTotals ? ` (${option.responsesPercentage}%)` : ''}
            </span>
          </span>
        </span>
      ));

  const elm = ReactDOMServer.renderToString(
    // Phrasing tags only (span/strong): block tags would break out of the chat
    // bubble's <p> wrapper, so the card is built from styled spans instead.
    <>
      <span className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-Gray-600 dark:text-dark-text">
          {i18n.t('polls.view-result-title')}
        </span>
        {pollDataWithOption.isTextAnswer && (
          <span className="rounded-full bg-Blue2-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-Blue2-700 dark:bg-dark-secondary2 dark:text-white">
            {i18n.t('polls.text-answer')}
          </span>
        )}
      </span>
      <strong className="block overflow-hidden break-all text-sm font-semibold text-Gray-950 dark:text-white">
        {pollDataWithOption.question}
      </strong>
      <span className="mt-2 flex flex-col gap-1.5">{formattedOptions}</span>
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

/** Shares the AI review of text answers in public chat. */
export const publishPollAICheckByChat = async (question: string, analysis: string) => {
  const conn = getNatsConn();
  const elm = ReactDOMServer.renderToString(
    <>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-Gray-600 dark:text-dark-text">
        {i18n.t('polls.ai-check-title')}
      </span>
      <strong className="block overflow-hidden break-all text-sm font-semibold text-Gray-950 dark:text-white">
        {question}
      </strong>
      <span className="mt-2 block whitespace-pre-line rounded-lg border border-Blue2-200 bg-Blue2-50/50 px-3 py-2 text-sm text-Gray-800 dark:border-Gray-700 dark:bg-dark-secondary2 dark:text-white">
        {analysis.trim()}
      </span>
    </>,
  );
  if (conn) {
    await conn.sendChatMsg('public', elm);
  }
};
