import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  InsightsAITextChatContentSchema,
  InsightsAITextChatRole,
  InsightsAITextChatStreamResult,
  InsightsAIRequestSource,
} from 'plugnmeet-protocol-js';

import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

const STREAM_TIMEOUT_MS = 60_000;

interface PendingNotepadAIStream {
  resolve: (fullText: string) => void;
  reject: (error: Error) => void;
  chunks: string[];
  timer: ReturnType<typeof setTimeout>;
}

const pendingStreams = new Map<string, PendingNotepadAIStream>();

/**
 * Sends a Notepad AI prompt through the existing AI text chat stream endpoint,
 * tagged with requestFrom = NOTEPAD and a client-generated stream id so the
 * matching chunks can be correlated back to this call.
 */
export const executeNotepadAI = (prompt: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const streamId = crypto.randomUUID();

    const timer = setTimeout(() => {
      pendingStreams.delete(streamId);
      reject(new Error('Notepad AI request timed out'));
    }, STREAM_TIMEOUT_MS);

    pendingStreams.set(streamId, { resolve, reject, chunks: [], timer });

    const body = create(InsightsAITextChatContentSchema, {
      role: InsightsAITextChatRole.INSIGHTS_AI_TEXT_CHAT_ROLE_USER,
      text: prompt,
      streamId,
      requestFrom: InsightsAIRequestSource.INSIGHTS_AI_REQUEST_SOURCE_NOTEPAD,
    });

    sendAPIRequest(
      'insights/ai/textChat/execute',
      toBinary(InsightsAITextChatContentSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    )
      .then((r) => {
        const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
        if (!res.status) {
          clearTimeout(timer);
          pendingStreams.delete(streamId);
          reject(new Error(res.msg || 'Failed to start Notepad AI'));
        }
      })
      .catch((error) => {
        clearTimeout(timer);
        pendingStreams.delete(streamId);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
};

/**
 * Routes an incoming AI text chat stream result. Called from the NATS system
 * event handler. Notepad-tagged chunks are delivered to the matching pending
 * Notepad AI request; everything else is handled by the chat Redux slice.
 */
export const handleNotepadAIStreamResult = (
  data: InsightsAITextChatStreamResult,
): boolean => {
  const entry = pendingStreams.get(data.id);
  if (!entry) {
    return false;
  }

  if (data.isLastChunk) {
    clearTimeout(entry.timer);
    pendingStreams.delete(data.id);
    entry.chunks.push(data.text);
    entry.resolve(entry.chunks.join(''));
  } else {
    entry.chunks.push(data.text);
  }

  return true;
};
