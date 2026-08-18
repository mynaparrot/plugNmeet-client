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

const WHITEBOARD_AI_INSTRUCTIONS = `You are an expert at creating Mermaid diagrams. Turn the user's description into a Mermaid diagram that can be parsed by the mermaid-to-excalidraw renderer.

Rules:
- Respond with ONLY the raw Mermaid syntax.
- Do NOT wrap the output in markdown code fences (no \`\`\`mermaid blocks).
- Do NOT include any explanations, comments, or text outside the diagram.
- Choose the most appropriate Mermaid diagram type for the request:
  - flowchart / flowchart TD / flowchart LR for process flows, workflows and decision trees
  - sequenceDiagram for message and communication flows
  - classDiagram for object-oriented and class structures
  - stateDiagram-v2 for state machines
  - erDiagram for entity-relationship models
  - gantt for schedules and timelines
  - journey for user journey maps
  - pie for proportions
  - mindmap for brainstorming and taxonomies
- Keep node labels short and readable; use unique node identifiers.
- Use subgraphs when grouping related nodes adds clarity.`;

interface PendingWhiteboardAIStream {
  resolve: (fullText: string) => void;
  reject: (error: Error) => void;
  chunks: string[];
  timer: ReturnType<typeof setTimeout>;
  onChunk?: (text: string) => void;
}

const pendingStreams = new Map<string, PendingWhiteboardAIStream>();

/**
 * Sends a whiteboard AI prompt through the existing AI text chat stream
 * endpoint, tagged with requestFrom = WHITEBOARD and a client-generated stream
 * id so the matching chunks can be correlated back to this call. The response
 * is expected to be Mermaid, which the TTD dialog parses into canvas elements.
 */
export const executeWhiteboardAI = async (
  prompt: string,
  onChunk?: (text: string) => void,
): Promise<string> => {
  const streamId = crypto.randomUUID();
  const text = `${WHITEBOARD_AI_INSTRUCTIONS}\n\nUser request:\n${prompt}`;

  const body = create(InsightsAITextChatContentSchema, {
    role: InsightsAITextChatRole.INSIGHTS_AI_TEXT_CHAT_ROLE_USER,
    text,
    streamId,
    requestFrom: InsightsAIRequestSource.INSIGHTS_AI_REQUEST_SOURCE_WHITEBOARD,
  });

  const streamPromise = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingStreams.delete(streamId);
      reject(new Error('Whiteboard AI request timed out'));
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
      entry.reject(new Error(res.msg || 'Failed to start Whiteboard AI'));
    }
  }

  return streamPromise;
};

/**
 * Routes an incoming AI text chat stream result. Called from the NATS system
 * event handler. Whiteboard-tagged chunks are delivered to the matching pending
 * whiteboard AI request; everything else is handled by the chat Redux slice.
 */
export const handleWhiteboardAIStreamResult = (
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
