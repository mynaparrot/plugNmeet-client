import { describe, expect, it, vi } from 'vitest';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  InsightsAITextChatContentSchema,
  InsightsAITextChatStreamResult,
} from 'plugnmeet-protocol-js';

// Keep the tests free of browser-only setup (i18n backend / axios config).
const mocks = vi.hoisted(() => ({ sendAPIRequest: vi.fn() }));

vi.mock('../../../../helpers/i18n', () => ({ default: { t: (key: string) => key } }));
vi.mock('../../../../helpers/api/plugNmeetAPI', () => ({ default: mocks.sendAPIRequest }));

import {
  AIPollParseError,
  analyzePollTextAnswersWithAI,
  handlePollAIStreamResult,
  parseAIPollDraft,
} from '../pollAI';

const okResponse = () =>
  toBinary(CommonResponseSchema, create(CommonResponseSchema, { status: true }));

describe('parseAIPollDraft', () => {
  it('parses a choice poll draft', () => {
    const draft = parseAIPollDraft(
      JSON.stringify({
        question: 'Which planet is the largest?',
        options: [
          { text: 'Jupiter', is_correct: true },
          { text: 'Mars', is_correct: false },
        ],
        is_multiple: false,
        is_quiz: true,
        is_text_answer: false,
      }),
    );

    expect(draft).toEqual({
      question: 'Which planet is the largest?',
      options: [
        { text: 'Jupiter', isCorrect: true },
        { text: 'Mars', isCorrect: false },
      ],
      isMultiple: false,
      isQuiz: true,
      isTextAnswer: false,
    });
  });

  it('parses a text-answer draft and clears option-only flags', () => {
    const draft = parseAIPollDraft(
      JSON.stringify({
        question: 'Explain photosynthesis in one sentence.',
        options: [],
        is_multiple: true,
        is_quiz: true,
        is_text_answer: true,
      }),
    );

    expect(draft).toEqual({
      question: 'Explain photosynthesis in one sentence.',
      options: [],
      isMultiple: false,
      isQuiz: false,
      isTextAnswer: true,
    });
  });

  it('strips markdown code fences and clears correct answers outside quiz mode', () => {
    const draft = parseAIPollDraft(
      '```json\n{"question": "Pick one", "options": [{"text": "A", "is_correct": true}, {"text": "B"}], "is_multiple": false, "is_quiz": false}\n```',
    );

    expect(draft.options).toEqual([
      { text: 'A', isCorrect: false },
      { text: 'B', isCorrect: false },
    ]);
    expect(draft.isTextAnswer).toBe(false);
  });

  it('rejects a choice draft with fewer than two options', () => {
    expect(() =>
      parseAIPollDraft(
        JSON.stringify({
          question: 'Only one?',
          options: [{ text: 'A', is_correct: false }],
          is_text_answer: false,
        }),
      ),
    ).toThrow(AIPollParseError);
  });
});

describe('analyzePollTextAnswersWithAI', () => {
  it('sends only answer text and counts, then resolves with the streamed review', async () => {
    let requestBody: { text: string; streamId?: string } | undefined;
    mocks.sendAPIRequest.mockImplementation(async (_url: string, data: Uint8Array) => {
      requestBody = fromBinary(InsightsAITextChatContentSchema, data);
      return okResponse();
    });

    const promise = analyzePollTextAnswersWithAI('What is 2 + 2?', [
      { text: '4', count: 3 },
      { text: 'four', count: 1 },
    ]);

    await vi.waitFor(() => expect(requestBody).toBeDefined());

    expect(requestBody?.text).toContain('Question: What is 2 + 2?');
    expect(requestBody?.text).toContain('- "4" (3)');
    expect(requestBody?.text).toContain('- "four" (1)');

    handlePollAIStreamResult({
      id: requestBody?.streamId,
      text: 'The correct answer is 4.',
      isLastChunk: true,
    } as unknown as InsightsAITextChatStreamResult);

    await expect(promise).resolves.toBe('The correct answer is 4.');
  });
});
