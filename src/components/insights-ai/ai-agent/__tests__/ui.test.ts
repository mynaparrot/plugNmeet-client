import { beforeEach, describe, expect, it, vi } from 'vitest';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  AIAgentRuntimeState,
  AIAgentSendContextReqSchema,
  AIAgentStartReqSchema,
  AIAgentStateMsgSchema,
  AIAgentStatusResSchema,
  AIAgentStopReqSchema,
} from 'plugnmeet-protocol-js';

/*
 * UI layer tests: the HTTP transport is mocked, so assertions are made on the
 * request the helpers produce and the state the status bar model derives.
 */

const api = vi.hoisted(() => ({ sendAPIRequest: vi.fn() }));

vi.mock('../../../../helpers/api/plugNmeetAPI', () => ({ default: api.sendAPIRequest }));

vi.mock('../../../../helpers/i18n', () => ({ default: { t: (key: string) => key } }));

import {
  getAIAgentStatus,
  isAIAgentLiveState,
  pauseAIAgent,
  resumeAIAgent,
  sendAIAgentContext,
  startAIAgent,
  stopAIAgent,
} from '../api';
import { wrapPnmApiErrorBytes } from '../../../../helpers/api/apiError';
import {
  formatAIAgentElapsed,
  formatAIAgentToolName,
  getAIAgentDisplayName,
  getAIAgentDisplayStatusText,
  getAIAgentStatusLabel,
  isAIAgentBusyState,
  isAIAgentPaused,
  isAIAgentRunning,
  resolveAIAgentEffectiveState,
  shouldShowAIAgentStatusBar,
} from '../ui/statusModel';
import type { IAIAgentState } from '../../../../store/slices/interfaces/aiAgent';
import { StatusCode } from 'plugnmeet-protocol-js';

type SentRequest = [string, Uint8Array, boolean, string, string];

const lastRequest = () => {
  const calls = api.sendAPIRequest.mock.calls;
  return calls[calls.length - 1] as unknown as SentRequest;
};

const statusResBytes = (overrides: Record<string, unknown> = {}) =>
  toBinary(
    AIAgentStatusResSchema,
    create(AIAgentStatusResSchema, { status: true, msg: 'ok', ...overrides }),
  );

const agentState = (overrides: Partial<IAIAgentState> = {}): IAIAgentState => ({
  sessionId: 's1',
  agentUserId: 'pnm_agent-ai_agent-1',
  agentName: 'Tutor',
  state: AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_LISTENING,
  isSpeaking: false,
  toolInProgress: '',
  startedAt: 0,
  reason: '',
  traceId: '',
  ...overrides,
});

beforeEach(() => {
  api.sendAPIRequest.mockReset();
  api.sendAPIRequest.mockResolvedValue(statusResBytes());
});

describe('ai agent api helpers', () => {
  it('starts with the room defaults and posts protobuf to /aiAgent/start', async () => {
    const res = await startAIAgent();

    const [path, body, jsonEncode, contentType, responseType] = lastRequest();
    expect(path).toBe('aiAgent/start');
    expect(jsonEncode).toBe(false);
    expect(contentType).toBe('application/protobuf');
    expect(responseType).toBe('arraybuffer');
    expect(fromBinary(AIAgentStartReqSchema, body)).toEqual(create(AIAgentStartReqSchema, {}));
    expect(res).toEqual({ status: true, msg: 'ok', state: undefined });
  });

  it('encodes the start overrides', async () => {
    await startAIAgent({ systemPrompt: 'be brief' });
    expect(fromBinary(AIAgentStartReqSchema, lastRequest()[1]).systemPrompt).toBe('be brief');
  });

  it('sends the stop reason only when given', async () => {
    await stopAIAgent();
    expect(fromBinary(AIAgentStopReqSchema, lastRequest()[1]).reason).toBeUndefined();
    expect(lastRequest()[0]).toBe('aiAgent/stop');

    await stopAIAgent('host_stopped');
    expect(fromBinary(AIAgentStopReqSchema, lastRequest()[1]).reason).toBe('host_stopped');
  });

  it('posts pause, resume and status without a payload', async () => {
    await pauseAIAgent();
    expect(lastRequest()[0]).toBe('aiAgent/pause');
    expect(lastRequest()[1]).toHaveLength(0);

    await resumeAIAgent();
    expect(lastRequest()[0]).toBe('aiAgent/resume');

    await getAIAgentStatus();
    expect(lastRequest()[0]).toBe('aiAgent/status');
    expect(lastRequest()[1]).toHaveLength(0);
  });

  it('sends a proactive context with text and source', async () => {
    await sendAIAgentContext('10 seconds remaining', 'countdown_timer');

    const [path, body] = lastRequest();
    expect(path).toBe('aiAgent/sendContext');
    const req = fromBinary(AIAgentSendContextReqSchema, body);
    expect(req.text).toBe('10 seconds remaining');
    expect(req.source).toBe('countdown_timer');
  });

  it('decodes the agent state of the response', async () => {
    api.sendAPIRequest.mockResolvedValue(
      statusResBytes({
        state: create(AIAgentStateMsgSchema, {
          sessionId: 's1',
          agentUserId: 'pnm_agent-ai_agent-1',
          state: AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING,
        }),
      }),
    );

    const res = await getAIAgentStatus();
    expect(res.status).toBe(true);
    expect(res.state?.state).toBe(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING);
    expect(isAIAgentLiveState(res.state)).toBe(true);
  });

  it('reports transport failures with the server message key', async () => {
    api.sendAPIRequest.mockResolvedValue(
      wrapPnmApiErrorBytes({
        status: false,
        msg: 'ai-agent.errors.only-admin',
        statusCode: StatusCode.UNKNOWN_STATUS,
        httpStatus: 403,
      }),
    );

    const res = await pauseAIAgent();
    expect(res).toEqual({ status: false, msg: 'ai-agent.errors.only-admin' });
  });

  it('reports a rejected status response', async () => {
    api.sendAPIRequest.mockResolvedValue(
      statusResBytes({ status: false, msg: 'ai-agent.errors.not-allowed' }),
    );
    await expect(startAIAgent()).resolves.toEqual({
      status: false,
      msg: 'ai-agent.errors.not-allowed',
      state: undefined,
    });
  });
});

describe('ai agent status model', () => {
  it('treats only live states as running', () => {
    expect(isAIAgentRunning(null)).toBe(false);
    expect(
      isAIAgentRunning(agentState({ state: AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED })),
    ).toBe(false);
    expect(
      isAIAgentRunning(
        agentState({ state: AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED }),
      ),
    ).toBe(false);
    expect(isAIAgentRunning(agentState())).toBe(true);
  });

  it('detects the paused state', () => {
    expect(
      isAIAgentPaused(agentState({ state: AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_PAUSED })),
    ).toBe(true);
    expect(isAIAgentPaused(agentState())).toBe(false);
    expect(isAIAgentPaused(null)).toBe(false);
  });

  it('maps every runtime state to an i18n label', () => {
    const states = Object.values(AIAgentRuntimeState).filter(
      (value): value is AIAgentRuntimeState => typeof value === 'number',
    );

    for (const state of states) {
      const label = getAIAgentStatusLabel(state);
      expect(label.key.startsWith('ai-agent.state.')).toBe(true);
    }

    expect(getAIAgentStatusLabel(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_DRAWING).key).toBe(
      'ai-agent.state.drawing',
    );
    expect(getAIAgentStatusLabel(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_PAUSED).tone).toBe(
      'paused',
    );
    expect(getAIAgentStatusLabel(undefined).key).toBe('ai-agent.state.unknown');
  });

  it('separates the listening and speaking tones', () => {
    const tone = (state: AIAgentRuntimeState) => getAIAgentStatusLabel(state).tone;

    expect(tone(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_LISTENING)).toBe('active');
    expect(tone(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING)).toBe('speaking');
    expect(tone(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_THINKING)).toBe('busy');
    expect(tone(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_DRAWING)).toBe('busy');
    expect(tone(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_RECONNECTING)).toBe('busy');
    expect(tone(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED)).toBe('idle');
  });

  it('prefers the live agent name, then the configured one', () => {
    expect(getAIAgentDisplayName(agentState(), 'Configured')).toBe('Tutor');
    expect(getAIAgentDisplayName(agentState({ agentName: ' ' }), 'Configured')).toBe('Configured');
    expect(getAIAgentDisplayName(null, ' ')).toBe('AI Assistant');
  });

  it('humanises the running tool name', () => {
    expect(formatAIAgentToolName('draw_shapes')).toBe('draw shapes');
    expect(formatAIAgentToolName('polls-create')).toBe('polls create');
    expect(formatAIAgentToolName('whiteboard-draw_diagram')).toBe('whiteboard draw diagram');
    expect(formatAIAgentToolName('  ')).toBe('');
    expect(formatAIAgentToolName(undefined)).toBe('');
  });

  it('maps built-in tools to i18n labels', () => {
    expect(formatAIAgentToolName('whiteboard_write_content')).toBe(
      'ai-agent.tool.writing-on-whiteboard',
    );
    expect(formatAIAgentToolName('whiteboard_draw_freehand_svg')).toBe(
      'ai-agent.tool.drawing-on-whiteboard',
    );
    expect(formatAIAgentToolName('notepad_read')).toBe('ai-agent.tool.reading-notepad');
    expect(formatAIAgentToolName('get_poll_results')).toBe('ai-agent.tool.checking-poll-results');
    expect(formatAIAgentToolName('send_ai_chat_message')).toBe(
      'ai-agent.tool.sending-chat-message',
    );
  });

  it('drops the internal namespace of an external tool', () => {
    expect(formatAIAgentToolName('ext_docs_search_docs')).toBe('search docs');
    expect(formatAIAgentToolName('pnm_whiteboard_wipe')).toBe('whiteboard wipe');
  });

  it('treats thinking, drawing and (re)connecting as busy', () => {
    expect(isAIAgentBusyState(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_THINKING)).toBe(true);
    expect(isAIAgentBusyState(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_DRAWING)).toBe(true);
    expect(isAIAgentBusyState(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_CONNECTING)).toBe(true);
    expect(isAIAgentBusyState(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_RECONNECTING)).toBe(true);

    for (const state of [
      undefined,
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_LISTENING,
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING,
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_PAUSED,
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED,
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED,
    ]) {
      expect(isAIAgentBusyState(state)).toBe(false);
    }
  });

  it('shows the running tool instead of the state label', () => {
    const listening = AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_LISTENING;

    expect(getAIAgentDisplayStatusText(listening, 'Listening', 'draw_shapes')).toBe('draw shapes');
    expect(getAIAgentDisplayStatusText(listening, 'Listening', '  ')).toBe('Listening');
    expect(getAIAgentDisplayStatusText(listening, 'Listening', undefined)).toBe('Listening');
  });

  it('keeps the state label while the agent is speaking', () => {
    expect(
      getAIAgentDisplayStatusText(
        AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING,
        'Speaking',
        'draw_shapes',
      ),
    ).toBe('Speaking');
  });
});

describe('resolveAIAgentEffectiveState', () => {
  const speaking = AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_SPEAKING;

  it('has no state without an agent', () => {
    expect(resolveAIAgentEffectiveState(null)).toBe(
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED,
    );
    expect(resolveAIAgentEffectiveState(null, true)).toBe(
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_UNSPECIFIED,
    );
  });

  it('upgrades listening to speaking while the agent audio is still active', () => {
    expect(resolveAIAgentEffectiveState(agentState(), true)).toBe(speaking);
    expect(resolveAIAgentEffectiveState(agentState(), false)).toBe(
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_LISTENING,
    );
  });

  it('upgrades listening to speaking when the agent flags itself as speaking', () => {
    expect(resolveAIAgentEffectiveState(agentState({ isSpeaking: true }))).toBe(speaking);
  });

  it('upgrades thinking to speaking while audio plays and no tool runs', () => {
    const thinking = agentState({ state: AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_THINKING });

    expect(resolveAIAgentEffectiveState(thinking, true)).toBe(speaking);
    expect(resolveAIAgentEffectiveState(thinking, false)).toBe(
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_THINKING,
    );
  });

  it('keeps thinking while a tool is still running', () => {
    expect(
      resolveAIAgentEffectiveState(
        agentState({
          state: AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_THINKING,
          toolInProgress: 'whiteboard_write_content',
        }),
        true,
      ),
    ).toBe(AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_THINKING);
  });

  it('leaves every other state untouched', () => {
    for (const state of [
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_DRAWING,
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_PAUSED,
      speaking,
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_CONNECTING,
      AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED,
    ]) {
      expect(resolveAIAgentEffectiveState(agentState({ state }), true)).toBe(state);
      expect(resolveAIAgentEffectiveState(agentState({ state }), false)).toBe(state);
    }
  });
});

describe('formatAIAgentElapsed', () => {
  const start = 1_700_000_000_000;

  it('reads 00:00 without a usable start time', () => {
    expect(formatAIAgentElapsed(undefined, start)).toBe('00:00');
    expect(formatAIAgentElapsed(0, start)).toBe('00:00');
    expect(formatAIAgentElapsed(-5, start)).toBe('00:00');
    expect(formatAIAgentElapsed(start + 1000, start)).toBe('00:00');
  });

  it('counts whole seconds as MM:SS', () => {
    expect(formatAIAgentElapsed(start, start)).toBe('00:00');
    expect(formatAIAgentElapsed(start, start + 999)).toBe('00:00');
    expect(formatAIAgentElapsed(start, start + 5_000)).toBe('00:05');
    expect(formatAIAgentElapsed(start, start + 65_000)).toBe('01:05');
    expect(formatAIAgentElapsed(start, start + 59 * 60_000 + 59_000)).toBe('59:59');
  });

  it('switches to HH:MM:SS after an hour', () => {
    expect(formatAIAgentElapsed(start, start + 3_600_000)).toBe('01:00:00');
    expect(formatAIAgentElapsed(start, start + 3_661_000)).toBe('01:01:01');
    expect(formatAIAgentElapsed(start, start + 10 * 3_600_000 + 59_000)).toBe('10:00:59');
  });

  it('defaults the clock to now', () => {
    expect(formatAIAgentElapsed(0)).toBe('00:00');
    expect(formatAIAgentElapsed(Date.now() - 2_000)).toBe('00:02');
  });
});

describe('ai agent status bar visibility', () => {
  it('shows the bar only inside an AI session room', () => {
    expect(
      shouldShowAIAgentStatusBar({ isSessionRoom: false, canControl: true, agent: agentState() }),
    ).toBe(false);
    expect(
      shouldShowAIAgentStatusBar({ isSessionRoom: false, canControl: true, agent: null }),
    ).toBe(false);
  });

  it('shows the bar for whoever may control the agent before it starts', () => {
    expect(shouldShowAIAgentStatusBar({ isSessionRoom: true, canControl: true, agent: null })).toBe(
      true,
    );
  });

  it('keeps the bar for the participant after the agent stopped, so they can start it again', () => {
    expect(shouldShowAIAgentStatusBar({ isSessionRoom: true, canControl: true, agent: null })).toBe(
      true,
    );
    expect(
      shouldShowAIAgentStatusBar({
        isSessionRoom: true,
        canControl: true,
        agent: agentState({ state: AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED }),
      }),
    ).toBe(true);
  });

  it('waits for a running agent before showing the bar to everyone else', () => {
    expect(
      shouldShowAIAgentStatusBar({ isSessionRoom: true, canControl: false, agent: null }),
    ).toBe(false);
    expect(
      shouldShowAIAgentStatusBar({
        isSessionRoom: true,
        canControl: false,
        agent: agentState({
          state: AIAgentRuntimeState.AI_AGENT_RUNTIME_STATE_STOPPED,
        }),
      }),
    ).toBe(false);
    expect(
      shouldShowAIAgentStatusBar({
        isSessionRoom: true,
        canControl: false,
        agent: agentState(),
      }),
    ).toBe(true);
  });
});
