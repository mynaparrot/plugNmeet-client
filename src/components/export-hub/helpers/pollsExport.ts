import type { PollInfo, PollResponsesDetails } from 'plugnmeet-protocol-js';

import i18n from '../../../helpers/i18n';
import { store } from '../../../store';
import { pollsApi } from '../../../store/services/pollsApi';

export interface PollExportOption {
  text: string;
  votes: number;
  isCorrect: boolean;
  responsesPercentage: number;
}

export interface PollExportEntry {
  question: string;
  isRunning: boolean;
  isAnonymous: boolean;
  isMultiple: boolean;
  isQuiz: boolean;
  isTextAnswer?: boolean;
  options: PollExportOption[];
  totalRespondents: number;
  totalVotes: number;
  /** False when the vote counts could not be fetched for this poll. */
  resultsAvailable: boolean;
}

/**
 * Flattens a poll (plus its admin-only responses details, when available) into
 * the small shape the TXT export needs. Respondent identities are left out on
 * purpose: anonymous polls keep their aggregate counts only, so the export
 * never leaks voters.
 */
export const toPollExportEntry = (
  poll: PollInfo,
  details?: PollResponsesDetails,
): PollExportEntry => {
  if (poll.isTextAnswer) {
    const totalRespondents = Number(details?.totalRespondents ?? 0);
    // percentages are kept for parity with choice polls but never printed
    const options = (details?.textAnswers ?? []).map((item) => {
      const votes = Number(item.count ?? 0);
      return {
        text: item.text ?? '',
        votes,
        isCorrect: false,
        responsesPercentage:
          votes > 0 && totalRespondents > 0
            ? Math.round((votes / totalRespondents + Number.EPSILON) * 100)
            : 0,
      };
    });

    return {
      question: poll.question,
      isRunning: !!poll.isRunning,
      isAnonymous: !!poll.isAnonymous,
      isMultiple: false,
      isQuiz: false,
      isTextAnswer: true,
      options,
      totalRespondents,
      totalVotes: totalRespondents,
      resultsAvailable: !!details,
    };
  }

  const counts = new Map<string, number>();
  for (const option of details?.options ?? []) {
    counts.set(String(option.id), Number(option.voteCount ?? 0));
  }

  const totalRespondents = Number(details?.totalRespondents ?? 0);
  let totalVotes = 0;
  const options = (poll.options ?? []).map((option) => {
    const votes = counts.get(String(option.id)) ?? 0;
    totalVotes += votes;
    return {
      text: option.text,
      votes,
      // the server only reveals real values for closed polls, which is fine
      isCorrect: !!option.isCorrect,
      responsesPercentage:
        votes > 0 && totalRespondents > 0
          ? Math.round((votes / totalRespondents + Number.EPSILON) * 100)
          : 0,
    };
  });

  return {
    question: poll.question,
    isRunning: !!poll.isRunning,
    isAnonymous: !!poll.isAnonymous,
    isMultiple: !!poll.isMultiple,
    isQuiz: !!poll.isQuiz,
    options,
    totalRespondents,
    totalVotes,
    resultsAvailable: !!details,
  };
};

/**
 * Snapshot of the current session polls. The admin-only details endpoint
 * returns aggregate counts for anonymous polls only, and the builder ignores
 * respondents anyway.
 */
export const loadPollExportEntries = async (): Promise<PollExportEntry[]> => {
  // One-shot snapshot: forceRefetch bypasses the 30s polling cache, subscribe: false
  // keeps the export from registering a subscription that nobody ever unsubscribes.
  const oneShot = { forceRefetch: true, subscribe: false } as const;
  const listResponse = await store
    .dispatch(pollsApi.endpoints.getPollLists.initiate(undefined, oneShot))
    .unwrap();
  const polls = (listResponse.polls ?? [])
    .slice()
    .sort((a, b) => Number(a.created) - Number(b.created));

  const details = await Promise.allSettled(
    polls.map((poll) =>
      store
        .dispatch(pollsApi.endpoints.getPollResponsesDetails.initiate(poll.id, oneShot))
        .unwrap(),
    ),
  );

  return polls.map((poll, index) => {
    const result = details[index];
    return toPollExportEntry(
      poll,
      result.status === 'fulfilled' ? result.value.responsesDetails : undefined,
    );
  });
};

// Questions and options are user text: keep each of them on a single line.
const oneLine = (text: string): string => text.replace(/\s*\n\s*/g, ' ').trim();

const pollHeader = (poll: PollExportEntry, index: number): string => {
  const tags = [
    poll.isRunning
      ? i18n.t('export-hub.poll-status-open')
      : i18n.t('export-hub.poll-status-closed'),
  ];
  if (poll.isTextAnswer) {
    tags.push(i18n.t('export-hub.poll-type-text'));
  } else if (poll.isMultiple) {
    tags.push(i18n.t('export-hub.poll-type-multiple'));
  } else {
    tags.push(i18n.t('export-hub.poll-type-single'));
  }
  if (poll.isQuiz) {
    tags.push(i18n.t('export-hub.poll-tag-quiz'));
  }
  if (poll.isAnonymous) {
    tags.push(i18n.t('export-hub.poll-tag-anonymous'));
  }
  return i18n.t('export-hub.poll-heading', { number: index + 1, tags: tags.join(', ') });
};

const optionLine = (poll: PollExportEntry, option: PollExportOption): string => {
  const correct =
    poll.isQuiz && option.isCorrect ? ` ${i18n.t('export-hub.poll-correct-answer')}` : '';
  // percentages are meaningless for free-form answers
  const showPercentage = !poll.isTextAnswer && poll.totalRespondents > 0;
  const votes = poll.resultsAvailable
    ? `${option.votes}${showPercentage ? ` (${option.responsesPercentage}%)` : ''}`
    : i18n.t('export-hub.poll-option-unavailable');
  return `  - ${oneLine(option.text)}: ${votes}${correct}`;
};

const totalLine = (poll: PollExportEntry): string => {
  if (!poll.resultsAvailable) {
    return i18n.t('export-hub.poll-results-unavailable');
  }
  return poll.isMultiple
    ? i18n.t('export-hub.poll-total-votes', {
        votes: poll.totalVotes,
        count: poll.totalRespondents,
      })
    : i18n.t('export-hub.poll-total-responses', { count: poll.totalRespondents });
};

export const buildPollsTxt = (polls: PollExportEntry[], exportedAt: Date = new Date()): string => {
  const lines = [
    i18n.t('export-hub.polls-export-title'),
    i18n.t('export-hub.exported-at', { timestamp: exportedAt.toISOString() }),
    i18n.t('export-hub.polls-export-note'),
    '',
  ];

  if (polls.length === 0) {
    lines.push(i18n.t('export-hub.polls-export-none'));
  }

  polls.forEach((poll, index) => {
    lines.push(pollHeader(poll, index));
    lines.push(i18n.t('export-hub.poll-question', { question: oneLine(poll.question) }));
    poll.options.forEach((option) => lines.push(optionLine(poll, option)));
    lines.push(totalLine(poll));
    lines.push('');
  });

  return `${lines.join('\n').trimEnd()}\n`;
};
