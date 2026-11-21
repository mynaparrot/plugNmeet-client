import { create, fromJsonString, toJsonString } from '@bufbuild/protobuf';
import {
  AIAgentToolCallMsgSchema,
  AIAgentToolResultMsgSchema,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
  type AIAgentToolCallMsg,
} from 'plugnmeet-protocol-js';

import { store } from '../../../store';
import { getNatsConn } from '../../../helpers/nats';
import { executeNotepadReadTool, executeNotepadWriteTool } from './shared-notepad/notepadTool';
import { executePublishChatMessageTool, PUBLISH_CHAT_MESSAGE_TOOL } from './chatTool';
import { registerClientApiTools } from './clientApiTools';
import { registerWhiteboardAgentTools } from './whiteboard';

export type AIAgentToolHandler = (
  args: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

/** Every tool this client can execute on the agent's behalf. */
const toolHandlers = new Map<string, AIAgentToolHandler>([
  ['notepad_write', executeNotepadWriteTool],
  ['notepad_read', executeNotepadReadTool],
  [PUBLISH_CHAT_MESSAGE_TOOL, executePublishChatMessageTool],
]);

/**
 * Registers (or replaces) a client tool handler. Later milestones add their
 * handlers here instead of touching the transport.
 */
export const registerAIAgentToolHandler = (toolName: string, handler: AIAgentToolHandler) => {
  toolHandlers.set(toolName, handler);
};

type HandlerOutcome = { ok: boolean; resultJson: string; error: string };

const runHandler = async (call: AIAgentToolCallMsg): Promise<HandlerOutcome> => {
  const handler = toolHandlers.get(call.toolName);
  if (!handler) {
    return { ok: false, resultJson: '', error: `Unknown client tool "${call.toolName}".` };
  }

  let args: Record<string, unknown>;
  try {
    const parsed = call.argumentsJson ? JSON.parse(call.argumentsJson) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('arguments must be a JSON object');
    }
    args = parsed as Record<string, unknown>;
  } catch (e) {
    return { ok: false, resultJson: '', error: `Invalid tool arguments: ${(e as Error).message}` };
  }

  try {
    const result = await handler(args);
    const ok = result.ok !== false;
    const error = ok ? '' : String(result.error ?? 'tool failed');
    return { ok, resultJson: JSON.stringify(result), error };
  } catch (e) {
    return { ok: false, resultJson: '', error: (e as Error).message || 'tool failed' };
  }
};

const sendToolResult = (
  call: AIAgentToolCallMsg,
  ok: boolean,
  resultJson: string,
  error: string,
  durationMs: number,
) => {
  const conn = getNatsConn();
  if (!conn) {
    console.warn('[AIAgentToolDispatcher] cannot send tool result: NATS connection unavailable', {
      tool: call.toolName,
      callId: call.callId,
    });
    return;
  }

  const resultMsg = create(AIAgentToolResultMsgSchema, {
    callId: call.callId,
    ok,
    resultJson,
    error,
    durationMs: String(durationMs),
  });

  void conn.sendMessageToSystemWorker(
    create(NatsMsgClientToServerSchema, {
      event: NatsMsgClientToServerEvents.AI_AGENT_TOOL_RESULT,
      msg: toJsonString(AIAgentToolResultMsgSchema, resultMsg),
    }),
  );
};

const processToolCall = async (payload: string) => {
  let call: AIAgentToolCallMsg;
  try {
    call = fromJsonString(AIAgentToolCallMsgSchema, payload);
  } catch (e) {
    console.error('[AIAgentToolDispatcher] failed to parse tool call', e);
    return;
  }

  // Only the selected delegate answers; an empty target means everyone may.
  const currentUserId = store.getState().session.currentUser?.userId;
  if (call.targetUserId && call.targetUserId !== currentUserId) {
    console.debug('[AIAgentToolDispatcher] skipping tool call targeted to another user', {
      tool: call.toolName,
      callId: call.callId,
      targetUserId: call.targetUserId,
      currentUserId,
    });
    return;
  }

  console.debug('[AIAgentToolDispatcher] executing tool', {
    tool: call.toolName,
    callId: call.callId,
  });

  const startedAt = Date.now();
  const { ok, resultJson, error } = await runHandler(call);
  const durationMs = Date.now() - startedAt;

  if (ok) {
    console.debug('[AIAgentToolDispatcher] tool completed', {
      tool: call.toolName,
      callId: call.callId,
      durationMs,
    });
  } else {
    console.warn('[AIAgentToolDispatcher] tool failed', {
      tool: call.toolName,
      callId: call.callId,
      durationMs,
      error,
    });
  }

  sendToolResult(call, ok, resultJson, error, durationMs);
};

// The whiteboard tools register themselves here (and start the vision loop), so
// this module stays the only place that knows about the transport.
registerWhiteboardAgentTools();
registerClientApiTools();

// Client tools never interleave: one call is answered before the next runs.
let queue: Promise<void> = Promise.resolve();

export const handleAIAgentToolCall = (payload: string): Promise<void> => {
  const run = queue.then(() => processToolCall(payload));
  queue = run.catch((e) => {
    console.error('[AIAgentToolDispatcher] tool call failed', e);
  });
  return queue;
};
