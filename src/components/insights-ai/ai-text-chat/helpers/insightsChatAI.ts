import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  InsightsAITextChatContentSchema,
  InsightsAITextChatRole,
  InsightsAITextChatStreamResult,
} from 'plugnmeet-protocol-js';

import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import i18n from '../../../../helpers/i18n';

const STREAM_TIMEOUT_MS = 60_000;

interface PendingChatAIStream {
  resolve: (fullText: string) => void;
  reject: (error: Error) => void;
  chunks: string[];
  timer: ReturnType<typeof setTimeout>;
  onChunk?: (text: string) => void;
}

const pendingStreams = new Map<string, PendingChatAIStream>();

/**
 * Sends an AI text chat prompt through the existing chat stream endpoint with a
 * client-generated stream id so the matching chunks can be correlated back to
 * this call.
 */
export const executeInsightsChatAI = async (
  text: string,
  onChunk?: (text: string) => void,
): Promise<string> => {
  const streamId = crypto.randomUUID();

  const body = create(InsightsAITextChatContentSchema, {
    role: InsightsAITextChatRole.INSIGHTS_AI_TEXT_CHAT_ROLE_USER,
    text,
    streamId,
  });

  const streamPromise = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingStreams.delete(streamId);
      reject(new Error(i18n.t('insights.ai-text-chat.response-timed-out')));
    }, STREAM_TIMEOUT_MS);

    pendingStreams.set(streamId, {
      resolve,
      reject,
      chunks: [],
      timer,
      onChunk,
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
      entry.reject(new Error(res.msg || 'Failed to send message'));
    }
  }

  return streamPromise;
};

/**
 * Routes an incoming AI text chat stream result. Called from the NATS system
 * event handler after the notepad/whiteboard/poll requestFrom routing;
 * untagged chunks that don't match a pending stream are simply ignored.
 */
export const handleInsightsChatAIStreamResult = (
  data: InsightsAITextChatStreamResult,
): boolean => {
  const entry = pendingStreams.get(data.id);
  if (!entry) {
    return false;
  }

  if (data.text) {
    entry.chunks.push(data.text);
    entry.onChunk?.(data.text);
  }

  if (data.isLastChunk) {
    clearTimeout(entry.timer);
    pendingStreams.delete(data.id);
    entry.resolve(entry.chunks.join(''));
  }

  return true;
};
