import { describe, expect, it, vi } from 'vitest';

// The loader talks to the store/pollsApi; stub them so the pure builders stay testable.
const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  getPollListsInitiate: vi.fn(),
  getPollResponsesDetailsInitiate: vi.fn(),
}));

vi.mock('../../../../store', () => ({ store: { dispatch: mocks.dispatch } }));
vi.mock('../../../../store/services/pollsApi', () => ({
  pollsApi: {
    endpoints: {
      getPollLists: { initiate: mocks.getPollListsInitiate },
      getPollResponsesDetails: { initiate: mocks.getPollResponsesDetailsInitiate },
    },
  },
}));
vi.mock('../../../../helpers/i18n', async () => {
  const { createTestI18n } = await import('./i18nTestUtils');
  return { default: await createTestI18n() };
});

import i18n from '../../../../helpers/i18n';
import { buildPollsTxt, loadPollExportEntries, toPollExportEntry } from '../pollsExport';
import { exportHubT } from './i18nTestUtils';

const t = (key: string, options?: Record<string, unknown>) => exportHubT(i18n, key, options);

const poll = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'p1',
    question: 'Favourite colour?',
    options: [
      { id: 1, text: 'Blue', isCorrect: false },
      { id: 2, text: 'Green', isCorrect: true },
    ],
    isRunning: false,
    isAnonymous: false,
    isMultiple: false,
    isQuiz: false,
    created: 1700000000000,
    ...overrides,
  }) as never;

const details = (overrides: Record<string, unknown> = {}) =>
  ({
    totalRespondents: 4,
    options: [
      { id: 1, voteCount: 1 },
      { id: 2, voteCount: 3 },
    ],
    respondents: [{ userId: 'u1', name: 'Alice' }],
    ...overrides,
  }) as never;

describe('toPollExportEntry', () => {
  it('maps vote counts and response percentages', () => {
    const entry = toPollExportEntry(poll(), details());

    expect(entry.options.map((option) => option.votes)).toEqual([1, 3]);
    expect(entry.options.map((option) => option.responsesPercentage)).toEqual([25, 75]);
    expect(entry.totalVotes).toBe(4);
    expect(entry.totalRespondents).toBe(4);
    expect(entry.resultsAvailable).toBe(true);
  });

  it('keeps the poll usable when the details request failed', () => {
    const entry = toPollExportEntry(poll());

    expect(entry.options.map((option) => option.votes)).toEqual([0, 0]);
    expect(entry.totalRespondents).toBe(0);
    expect(entry.resultsAvailable).toBe(false);
  });

  it('never carries respondent identities', () => {
    const entry = toPollExportEntry(poll({ isAnonymous: true }), details());

    expect(JSON.stringify(entry)).not.toContain('Alice');
    expect(JSON.stringify(entry)).not.toContain('u1');
  });
});

describe('loadPollExportEntries', () => {
  it('takes a one-shot snapshot in creation order and tolerates failed details', async () => {
    const polls = [
      poll({ id: 'p2', question: 'Second?', created: 2000 }),
      poll({ id: 'p1', question: 'First?', created: 1000 }),
    ];
    mocks.getPollListsInitiate.mockReturnValue({
      unwrap: () => Promise.resolve({ polls }),
    });
    mocks.getPollResponsesDetailsInitiate.mockImplementation((pollId: string) =>
      pollId === 'p1'
        ? { unwrap: () => Promise.resolve({ responsesDetails: details() }) }
        : { unwrap: () => Promise.reject(new Error('details unavailable')) },
    );
    mocks.dispatch.mockImplementation((initiated) => initiated);

    const entries = await loadPollExportEntries();

    const oneShot = { forceRefetch: true, subscribe: false };
    expect(mocks.getPollListsInitiate).toHaveBeenCalledWith(undefined, oneShot);
    expect(mocks.getPollResponsesDetailsInitiate).toHaveBeenCalledWith('p1', oneShot);
    expect(mocks.getPollResponsesDetailsInitiate).toHaveBeenCalledWith('p2', oneShot);
    expect(entries.map((entry) => entry.question)).toEqual(['First?', 'Second?']);
    expect(entries.map((entry) => entry.resultsAvailable)).toEqual([true, false]);
  });
});

describe('buildPollsTxt', () => {
  const exportedAt = new Date('2024-01-01T00:00:00.000Z');
  const heading = (number: number, tags: string[]) =>
    t('poll-heading', { number, tags: tags.join(', ') });

  it('writes a translated header for the snapshot', () => {
    const txt = buildPollsTxt([toPollExportEntry(poll(), details())], exportedAt);

    expect(txt).toContain(t('polls-export-title'));
    expect(txt).toContain(t('exported-at', { timestamp: '2024-01-01T00:00:00.000Z' }));
    expect(txt).toContain(t('polls-export-note'));
  });

  it('writes status, question, options, percentages and total', () => {
    const txt = buildPollsTxt([toPollExportEntry(poll(), details())], exportedAt);

    expect(txt).toContain(heading(1, [t('poll-status-closed'), t('poll-type-single')]));
    expect(txt).toContain(t('poll-question', { question: 'Favourite colour?' }));
    expect(txt).toContain('  - Blue: 1 (25%)');
    expect(txt).toContain('  - Green: 3 (75%)');
    expect(txt).toContain(t('poll-total-responses', { count: 4 }));
  });

  it('marks quiz correct answers and multiple choice totals', () => {
    const txt = buildPollsTxt(
      [toPollExportEntry(poll({ isQuiz: true, isMultiple: true, isRunning: true }), details())],
      exportedAt,
    );

    expect(txt).toContain(
      heading(1, [t('poll-status-open'), t('poll-type-multiple'), t('poll-tag-quiz')]),
    );
    expect(txt).toContain(`  - Green: 3 (75%) ${t('poll-correct-answer')}`);
    expect(txt).toContain(t('poll-total-votes', { votes: 4, count: 4 }));
  });

  it('flags anonymous polls without listing voters', () => {
    const txt = buildPollsTxt(
      [toPollExportEntry(poll({ isAnonymous: true }), details())],
      exportedAt,
    );

    expect(txt).toContain(
      heading(1, [t('poll-status-closed'), t('poll-type-single'), t('poll-tag-anonymous')]),
    );
    expect(txt).not.toContain('Alice');
    expect(txt).not.toContain('u1');
  });

  it('marks unavailable vote counts', () => {
    const txt = buildPollsTxt([toPollExportEntry(poll())], exportedAt);

    expect(txt).toContain(`  - Blue: ${t('poll-option-unavailable')}`);
    expect(txt).toContain(t('poll-results-unavailable'));
  });

  it('keeps multi-line questions on one line', () => {
    const txt = buildPollsTxt(
      [toPollExportEntry(poll({ question: 'line one\nline two' }), details())],
      exportedAt,
    );

    expect(txt).toContain(t('poll-question', { question: 'line one line two' }));
  });

  it('marks an empty export', () => {
    expect(buildPollsTxt([], exportedAt)).toContain(t('polls-export-none'));
  });

  it('resolves every exported label through the translations', () => {
    const txt = buildPollsTxt(
      [
        toPollExportEntry(poll({ isQuiz: true, isMultiple: true, isAnonymous: true }), details()),
        toPollExportEntry(poll({ id: 'p2' })),
      ],
      exportedAt,
    );

    // Missing keys would surface as their dotted key path in the file.
    expect(txt).not.toContain('export-hub.');
  });
});
