import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  InsightsAITextChatContentSchema,
  InsightsAITextChatRole,
  InsightsAITextChatStreamResult,
  InsightsAIRequestSource,
} from 'plugnmeet-protocol-js';

import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import i18n from '../../../helpers/i18n';

const STREAM_TIMEOUT_MS = 60_000;
const MIN_POLL_OPTIONS = 2;
const MAX_POLL_OPTIONS = 6;

export const POLL_AI_INSTRUCTIONS = `Generate ONE poll for a live meeting tool from the user's topic description.

Rules:
- Return ONLY strict JSON: no markdown fences, no commentary.
- Shape: {"question": string, "options": [{"text": string, "is_correct": boolean}], "is_multiple": boolean, "is_quiz": boolean}
- Provide 2 to 6 options with short option texts and a concise question.
- Set "is_correct" to true only when "is_quiz" is true, and a quiz poll must have at least one correct option.
- Choose "is_multiple" and "is_quiz" to fit the topic; use "is_quiz" for knowledge-check topics.

Return ONLY strict JSON.`;

export interface AIPollDraftOption {
  text: string;
  isCorrect: boolean;
}

export interface AIPollDraft {
  question: string;
  options: AIPollDraftOption[];
  isMultiple: boolean;
  isQuiz: boolean;
}

/** Thrown when the AI output cannot be parsed into a valid poll draft. */
export class AIPollParseError extends Error {}

interface PendingPollAIStream {
  resolve: (fullText: string) => void;
  reject: (error: Error) => void;
  chunks: string[];
  timer: ReturnType<typeof setTimeout>;
}

const pendingStreams = new Map<string, PendingPollAIStream>();

// Strip accidental markdown code fences around the JSON payload.
const stripCodeFences = (text: string): string => {
  const match = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1].trim() : text.trim();
};

/**
 * Validates and normalizes the AI response into a poll draft the create form
 * can prefill. Throws AIPollParseError when the draft is unusable.
 */
export const parseAIPollDraft = (text: string): AIPollDraft => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    throw new AIPollParseError('AI poll output is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AIPollParseError('AI poll output must be a JSON object');
  }
  const raw = parsed as Record<string, unknown>;

  const question = typeof raw.question === 'string' ? raw.question.trim() : '';
  if (!question) {
    throw new AIPollParseError('AI poll output has no question');
  }

  if (!Array.isArray(raw.options)) {
    throw new AIPollParseError('AI poll output has no options');
  }
  const options = raw.options
    .map((option) =>
      option && typeof option === 'object'
        ? (option as Record<string, unknown>)
        : null,
    )
    .filter((option) => option !== null)
    .map((option) => ({
      text: typeof option.text === 'string' ? option.text.trim() : '',
      isCorrect: option.is_correct === true,
    }))
    .filter((option) => option.text !== '');
  if (options.length < MIN_POLL_OPTIONS) {
    throw new AIPollParseError('AI poll output needs at least two options');
  }
  // Stay within the option range the generator was instructed to use.
  const limitedOptions = options.slice(0, MAX_POLL_OPTIONS);

  const isQuiz = raw.is_quiz === true;
  const isMultiple = raw.is_multiple === true;

  // Correct answers only make sense in quiz mode.
  const normalizedOptions = isQuiz
    ? limitedOptions
    : limitedOptions.map((option) => ({
        text: option.text,
        isCorrect: false,
      }));

  return {
    question,
    options: normalizedOptions,
    isMultiple,
    isQuiz,
  };
};

/**
 * Sends a poll AI prompt through the existing AI text chat stream endpoint,
 * tagged with requestFrom = POLL and a client-generated stream id so the
 * matching chunks can be correlated back to this call. The response is
 * expected to be strict JSON, parsed by parseAIPollDraft.
 */
export const generatePollWithAI = async (prompt: string): Promise<string> => {
  const streamId = crypto.randomUUID();
  const text = `${POLL_AI_INSTRUCTIONS}\n\nUser request:\n${prompt}`;

  const body = create(InsightsAITextChatContentSchema, {
    role: InsightsAITextChatRole.INSIGHTS_AI_TEXT_CHAT_ROLE_USER,
    text,
    streamId,
    requestFrom: InsightsAIRequestSource.INSIGHTS_AI_REQUEST_SOURCE_POLL,
  });

  const streamPromise = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingStreams.delete(streamId);
      reject(new Error(i18n.t('polls.errors.ai-request-timeout')));
    }, STREAM_TIMEOUT_MS);

    pendingStreams.set(streamId, {
      resolve,
      reject,
      chunks: [],
      timer,
    });
  });

  const r = await sendAPIRequest(
    'insights/ai/textChat/execute',
    toBinary(InsightsAITextChatContentSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );

  const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
  if (!res.status) {
    const entry = pendingStreams.get(streamId);
    if (entry) {
      clearTimeout(entry.timer);
      pendingStreams.delete(streamId);
      entry.reject(new Error(res.msg || 'Failed to start Poll AI'));
    }
  }

  return streamPromise;
};

/**
 * Routes an incoming AI text chat stream result. Called from the NATS system
 * event handler. Poll-tagged chunks are delivered to the matching pending poll
 * AI request; everything else is handled by the chat Redux slice.
 */
export const handlePollAIStreamResult = (
  data: InsightsAITextChatStreamResult,
): boolean => {
  const entry = pendingStreams.get(data.id);
  if (!entry) {
    return false;
  }

  if (data.text) {
    entry.chunks.push(data.text);
  }

  if (data.isLastChunk) {
    clearTimeout(entry.timer);
    pendingStreams.delete(data.id);
    entry.resolve(entry.chunks.join(''));
  }

  return true;
};
