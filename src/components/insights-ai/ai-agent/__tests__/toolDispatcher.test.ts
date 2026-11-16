import { beforeEach, describe, expect, it, vi } from 'vitest';
import { create, fromJsonString, toJsonString } from '@bufbuild/protobuf';
import {
  AIAgentToolCallMsgSchema,
  AIAgentToolResultMsgSchema,
  NatsMsgClientToServerEvents,
} from 'plugnmeet-protocol-js';

/*
 * Dispatcher tests: the transport is mocked, so a "sent result" is simply the
 * decoded NatsMsgClientToServer handed to sendMessageToSystemWorker.
 */

const { conn, state, notepad } = vi.hoisted(() => ({
  conn: {
    sendMessageToSystemWorker: vi.fn(),
  },
  state: { current: { session: { currentUser: { userId: 'me' } } } as Record<string, unknown> },
  notepad: { executeNotepadWriteTool: vi.fn(), executeNotepadReadTool: vi.fn() },
}));

vi.mock('../../../../helpers/nats', () => ({ getNatsConn: () => conn }));

vi.mock('../../../../store', () => ({ store: { getState: () => state.current } }));

vi.mock('../shared-notepad/notepadTool', () => ({
  executeNotepadWriteTool: notepad.executeNotepadWriteTool,
  executeNotepadReadTool: notepad.executeNotepadReadTool,
}));

// The whiteboard tools have their own suite; here only the transport matters.
vi.mock('../whiteboard', () => ({ registerWhiteboardAgentTools: vi.fn() }));

// Same for the client API registry (browser-only dependencies).
vi.mock('../clientApiTools', () => ({ registerClientApiTools: vi.fn() }));

import { handleAIAgentToolCall, registerAIAgentToolHandler } from '../toolDispatcher';

type SentMessage = { event: number; msg: string };

const sentMessages = () =>
  (conn.sendMessageToSystemWorker.mock.calls as unknown as [SentMessage][]).map(([m]) => m);

const sentResults = () =>
  sentMessages().map((m) => fromJsonString(AIAgentToolResultMsgSchema, m.msg));

const callJson = (
  overrides: Partial<{
    toolName: string;
    argumentsJson: string;
    targetUserId: string;
    callId: string;
  }> = {},
) =>
  toJsonString(
    AIAgentToolCallMsgSchema,
    create(AIAgentToolCallMsgSchema, {
      sessionId: 'session-1',
      callId: overrides.callId ?? 'call-1',
      toolName: overrides.toolName ?? 'notepad_write',
      argumentsJson: overrides.argumentsJson ?? '{"mode":"append","markdown":"hi"}',
      targetUserId: overrides.targetUserId ?? 'me',
      deadlineUnixMs: '0',
      traceId: 'trace-1',
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  state.current = { session: { currentUser: { userId: 'me' } } };
  notepad.executeNotepadWriteTool.mockResolvedValue({ ok: true, length: 2, mode: 'append' });
});

describe('handleAIAgentToolCall', () => {
  it('runs notepad_write and answers with the tool result', async () => {
    await handleAIAgentToolCall(callJson());

    expect(notepad.executeNotepadWriteTool).toHaveBeenCalledWith({
      mode: 'append',
      markdown: 'hi',
    });

    const [sent] = sentMessages();
    expect(sent.event).toBe(NatsMsgClientToServerEvents.AI_AGENT_TOOL_RESULT);

    const [result] = sentResults();
    expect(result.callId).toBe('call-1');
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.resultJson)).toEqual({ ok: true, length: 2, mode: 'append' });
    expect(result.error).toBe('');
    expect(Number(result.durationMs)).toBeGreaterThanOrEqual(0);
  });

  it('routes notepad_read to the notepad read handler', async () => {
    notepad.executeNotepadReadTool.mockResolvedValue({ ok: true, participant_count: 1 });

    await handleAIAgentToolCall(callJson({ toolName: 'notepad_read', argumentsJson: '{}' }));

    expect(notepad.executeNotepadReadTool).toHaveBeenCalledWith({});
    const [result] = sentResults();
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.resultJson)).toEqual({ ok: true, participant_count: 1 });
  });

  it('ignores a call addressed to another participant', async () => {
    await handleAIAgentToolCall(callJson({ targetUserId: 'someone-else' }));

    expect(notepad.executeNotepadWriteTool).not.toHaveBeenCalled();
    expect(sentMessages()).toHaveLength(0);
  });

  it('answers an unknown tool with a model-readable error', async () => {
    await handleAIAgentToolCall(callJson({ toolName: 'whiteboard_draw_shapes' }));

    const [result] = sentResults();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('whiteboard_draw_shapes');
  });

  it('answers invalid arguments without calling the tool', async () => {
    await handleAIAgentToolCall(callJson({ argumentsJson: 'not-json' }));

    expect(notepad.executeNotepadWriteTool).not.toHaveBeenCalled();
    const [result] = sentResults();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Invalid tool arguments');
  });

  it('forwards a failed tool result as ok: false', async () => {
    notepad.executeNotepadWriteTool.mockResolvedValue({
      ok: false,
      length: 0,
      mode: 'append',
      error: 'The shared notepad is not active right now.',
    });

    await handleAIAgentToolCall(callJson());

    const [result] = sentResults();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('The shared notepad is not active right now.');
    expect(JSON.parse(result.resultJson).ok).toBe(false);
  });

  it('runs calls sequentially so client tools never interleave', async () => {
    const order: string[] = [];
    registerAIAgentToolHandler('slow_tool', async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push('slow');
      return { ok: true, marker: 'slow' };
    });
    registerAIAgentToolHandler('fast_tool', async () => {
      order.push('fast');
      return { ok: true, marker: 'fast' };
    });

    await Promise.all([
      handleAIAgentToolCall(callJson({ toolName: 'slow_tool', callId: 'slow' })),
      handleAIAgentToolCall(callJson({ toolName: 'fast_tool', callId: 'fast' })),
    ]);

    expect(order).toEqual(['slow', 'fast']);
    expect(sentResults().map((r) => r.callId)).toEqual(['slow', 'fast']);
  });
});
