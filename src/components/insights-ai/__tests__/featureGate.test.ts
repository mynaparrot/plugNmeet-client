import { describe, expect, it } from 'vitest';
import { AIAgentSessionMode } from 'plugnmeet-protocol-js';

import type { RootState } from '../../../store';
import type { IRoomMetadata } from '../../../store/slices/interfaces/session';
import {
  getAIAgentAllowedParticipantIds,
  getAIAgentMaxConcurrentSessions,
  hasInsightsAiSettingsTabs,
  isAIAgentAutoStart,
  isAIAgentChatEnabled,
  isAIAgentSessionObserver,
  isAIAgentSessionRoom,
  isAutoPerUserAISessionRoom,
  isInsightsAiTextChatEnabled,
  selectIsInsightsAiTextChatEnabled,
} from '../featureGate';

/*
 * The AI Chat box is shared by the standalone AI text chat feature and the AI
 * Agent, so the gates have to agree on which one is in charge.
 */

const metadata = (insightsFeatures: unknown, extra: Record<string, unknown> = {}): IRoomMetadata =>
  ({ roomFeatures: { insightsFeatures }, ...extra }) as unknown as IRoomMetadata;

const buildState = (
  insightsFeatures: unknown,
  userId?: string,
  extra: Record<string, unknown> = {},
) =>
  ({
    session: {
      currentRoom: { metadata: metadata(insightsFeatures, extra) },
      currentUser: { userId },
    },
  }) as unknown as RootState;

const aiAgent = (overrides: Record<string, unknown> = {}) => ({
  isAllow: true,
  sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_NORMAL_ROOM,
  ...overrides,
});

/** Controlled-users mode: exactly the participants listed in autoSessionConfig. */
const controlled = (
  allowedParticipantIds: string[],
  extra: Record<string, unknown> = {},
  mode = AIAgentSessionMode.AI_AGENT_SESSION_MODE_CONTROLLED_USERS,
) =>
  aiAgent({
    sessionMode: mode,
    autoSessionConfig: { allowedParticipantIds, ...extra },
  });

const openPerUser = (maxConcurrentSessions = 4, autoStartAgent?: boolean) =>
  aiAgent({
    sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_OPEN_PER_USER,
    autoSessionConfig: { maxConcurrentSessions, autoStartAgent },
  });

describe('session mode helpers', () => {
  it('reads the allowed participants in controlled-users mode only', () => {
    expect(getAIAgentAllowedParticipantIds(undefined)).toEqual([]);
    expect(getAIAgentAllowedParticipantIds(metadata({ aiAgentFeatures: aiAgent() }))).toEqual([]);
    expect(
      getAIAgentAllowedParticipantIds(metadata({ aiAgentFeatures: controlled(['u1', 'u2']) })),
    ).toEqual(['u1', 'u2']);
    expect(getAIAgentAllowedParticipantIds(metadata({ aiAgentFeatures: openPerUser() }))).toEqual(
      [],
    );
    expect(
      getAIAgentAllowedParticipantIds(
        metadata({
          aiAgentFeatures: aiAgent({
            sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_CONTROLLED_USERS,
          }),
        }),
      ),
    ).toEqual([]);
  });

  it('reads the concurrent session limit in open-per-user mode only', () => {
    expect(getAIAgentMaxConcurrentSessions(undefined)).toBe(0);
    expect(getAIAgentMaxConcurrentSessions(metadata({ aiAgentFeatures: openPerUser(6) }))).toBe(6);
    expect(getAIAgentMaxConcurrentSessions(metadata({ aiAgentFeatures: controlled(['u1']) }))).toBe(
      0,
    );
    expect(
      getAIAgentMaxConcurrentSessions(
        metadata({
          aiAgentFeatures: aiAgent({
            sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_OPEN_PER_USER,
          }),
        }),
      ),
    ).toBe(0);
  });

  it('auto-starts in both automatic modes unless it is explicitly off', () => {
    expect(isAIAgentAutoStart(undefined)).toBe(false);
    expect(isAIAgentAutoStart(metadata({ aiAgentFeatures: aiAgent() }))).toBe(false);
    expect(isAIAgentAutoStart(metadata({ aiAgentFeatures: controlled(['u1']) }))).toBe(true);
    expect(isAIAgentAutoStart(metadata({ aiAgentFeatures: openPerUser(4) }))).toBe(true);
    expect(
      isAIAgentAutoStart(
        metadata({ aiAgentFeatures: controlled(['u1'], { autoStartAgent: false }) }),
      ),
    ).toBe(false);
    expect(isAIAgentAutoStart(metadata({ aiAgentFeatures: openPerUser(4, false) }))).toBe(false);
  });

  it('flags open-per-user and every controlled room with allowed users as per-user', () => {
    expect(isAutoPerUserAISessionRoom(undefined)).toBe(false);
    expect(isAutoPerUserAISessionRoom(metadata({ aiAgentFeatures: aiAgent() }))).toBe(false);
    expect(isAutoPerUserAISessionRoom(metadata({ aiAgentFeatures: openPerUser() }))).toBe(true);
    expect(
      isAutoPerUserAISessionRoom(metadata({ aiAgentFeatures: controlled(['u1', 'u2']) })),
    ).toBe(true);
    // a single allowed user is routed to their own room just like several
    expect(isAutoPerUserAISessionRoom(metadata({ aiAgentFeatures: controlled(['u1']) }))).toBe(
      true,
    );
    expect(isAutoPerUserAISessionRoom(metadata({ aiAgentFeatures: controlled([]) }))).toBe(false);
    expect(
      isAutoPerUserAISessionRoom(
        metadata({
          aiAgentFeatures: controlled(
            ['u1', 'u2'],
            {},
            AIAgentSessionMode.AI_AGENT_SESSION_MODE_NORMAL_ROOM,
          ),
        }),
      ),
    ).toBe(false);
    expect(
      isAutoPerUserAISessionRoom(
        metadata({ aiAgentFeatures: controlled(['u1', 'u2'], { autoStartAgent: false }) }),
      ),
    ).toBe(true);
    expect(
      isAutoPerUserAISessionRoom(
        metadata({ aiAgentFeatures: { ...openPerUser(), isAllow: false } }),
      ),
    ).toBe(false);
  });

  it('never treats a 1-on-1 session room as a per-user lobby', () => {
    expect(
      isAutoPerUserAISessionRoom(
        metadata({ aiAgentFeatures: controlled(['u1']) }, { isBreakoutRoom: true }),
      ),
    ).toBe(false);
    expect(
      isAutoPerUserAISessionRoom(
        metadata({ aiAgentFeatures: openPerUser() }, { isBreakoutRoom: true }),
      ),
    ).toBe(false);
  });
});

describe('isAIAgentSessionRoom', () => {
  it('is off without the agent feature', () => {
    expect(isAIAgentSessionRoom(undefined)).toBe(false);
    expect(isAIAgentSessionRoom(metadata(undefined))).toBe(false);
    expect(isAIAgentSessionRoom(metadata({ aiAgentFeatures: { isAllow: false } }))).toBe(false);
  });

  it('is off in a normal group room', () => {
    expect(isAIAgentSessionRoom(metadata({ aiAgentFeatures: aiAgent() }))).toBe(false);
    expect(
      isAIAgentSessionRoom(metadata({ aiAgentFeatures: controlled(['user_1', 'user_2']) })),
    ).toBe(false);
    expect(isAIAgentSessionRoom(metadata({ aiAgentFeatures: openPerUser() }))).toBe(false);
  });

  it('is off in a parent lobby, even when it lists a single participant', () => {
    expect(isAIAgentSessionRoom(metadata({ aiAgentFeatures: controlled(['u1']) }))).toBe(false);
    expect(
      isAIAgentSessionRoom(
        metadata({
          aiAgentFeatures: controlled(
            ['u1'],
            {},
            AIAgentSessionMode.AI_AGENT_SESSION_MODE_NORMAL_ROOM,
          ),
        }),
      ),
    ).toBe(false);
  });

  it('is on in every breakout room that allows the agent', () => {
    expect(
      isAIAgentSessionRoom(metadata({ aiAgentFeatures: aiAgent() }, { isBreakoutRoom: true })),
    ).toBe(true);
    expect(
      isAIAgentSessionRoom(
        metadata({ aiAgentFeatures: controlled(['u1']) }, { isBreakoutRoom: true }),
      ),
    ).toBe(true);
  });

  it('is off in a breakout room when the agent is disabled', () => {
    expect(
      isAIAgentSessionRoom(
        metadata({ aiAgentFeatures: { ...aiAgent(), isAllow: false } }, { isBreakoutRoom: true }),
      ),
    ).toBe(false);
  });
});

describe('isAIAgentSessionObserver', () => {
  const sessionRoom = metadata(
    { aiAgentFeatures: controlled(['user_1']) },
    { isBreakoutRoom: true },
  );

  it('is off for the assigned participant', () => {
    expect(isAIAgentSessionObserver(sessionRoom, 'user_1')).toBe(false);
  });

  it('is on for anyone else in the 1-on-1 room, an admin included', () => {
    expect(isAIAgentSessionObserver(sessionRoom, 'admin_1')).toBe(true);
  });

  it('is off outside a 1-on-1 room and without a user', () => {
    expect(
      isAIAgentSessionObserver(metadata({ aiAgentFeatures: controlled(['user_1']) }), 'admin_1'),
    ).toBe(false);
    expect(isAIAgentSessionObserver(sessionRoom, undefined)).toBe(false);
    expect(isAIAgentSessionObserver(undefined, 'admin_1')).toBe(false);
  });
});

describe('isAIAgentChatEnabled', () => {
  it('requires the agent to own the room', () => {
    expect(isAIAgentChatEnabled(undefined)).toBe(false);
    expect(isAIAgentChatEnabled(metadata({ aiAgentFeatures: aiAgent() }))).toBe(false);
    expect(
      isAIAgentChatEnabled(
        metadata({ aiAgentFeatures: controlled(['u1']) }, { isBreakoutRoom: true }),
      ),
    ).toBe(true);
  });

  it('turns off when the agent may not write chat messages', () => {
    expect(
      isAIAgentChatEnabled(
        metadata(
          { aiAgentFeatures: aiAgent({ allowChatMessage: false }) },
          { isBreakoutRoom: true },
        ),
      ),
    ).toBe(false);
  });

  it('only lets the named participant of a 1-on-1 room talk to the agent', () => {
    const sessionRoom = metadata(
      { aiAgentFeatures: controlled(['user_1']) },
      { isBreakoutRoom: true },
    );
    expect(isAIAgentChatEnabled(sessionRoom, 'user_1')).toBe(true);
    // an admin dropping in is only observing
    expect(isAIAgentChatEnabled(sessionRoom, 'admin_1')).toBe(false);
  });
});

describe('isInsightsAiTextChatEnabled', () => {
  it('keeps working with the standalone feature alone', () => {
    expect(
      isInsightsAiTextChatEnabled(
        metadata({ aiFeatures: { aiTextChatFeatures: { isEnabled: true } } }),
      ),
    ).toBe(true);
  });

  it('opens the chat box for an agent that owns the room', () => {
    expect(
      isInsightsAiTextChatEnabled(
        metadata({ aiFeatures: {}, aiAgentFeatures: aiAgent() }, { isBreakoutRoom: true }),
      ),
    ).toBe(true);
  });

  it('stays closed in a group room where the agent does not run', () => {
    expect(
      isInsightsAiTextChatEnabled(metadata({ aiFeatures: {}, aiAgentFeatures: aiAgent() })),
    ).toBe(false);
    expect(selectIsInsightsAiTextChatEnabled(buildState(undefined))).toBe(false);
  });

  it('reads the gate straight from the store state', () => {
    expect(
      selectIsInsightsAiTextChatEnabled(
        buildState({
          aiFeatures: { aiTextChatFeatures: { isEnabled: true } },
          aiAgentFeatures: aiAgent(),
        }),
      ),
    ).toBe(true);
  });

  it('closes the chat box for an observer of a 1-on-1 room', () => {
    expect(
      selectIsInsightsAiTextChatEnabled(
        buildState({ aiAgentFeatures: controlled(['user_1']) }, 'admin_1', {
          isBreakoutRoom: true,
        }),
      ),
    ).toBe(false);
  });
});

describe('hasInsightsAiSettingsTabs', () => {
  const groupRoom = {
    isAllow: true,
    aiFeatures: { isAllow: true, aiTextChatFeatures: { isAllow: true } },
    aiAgentFeatures: aiAgent(),
  };

  it('keeps the standalone chat settings in a group room', () => {
    expect(hasInsightsAiSettingsTabs(metadata(groupRoom))).toBe(true);
  });

  it('hides the standalone chat settings inside an AI session room', () => {
    expect(hasInsightsAiSettingsTabs(metadata(groupRoom, { isBreakoutRoom: true }))).toBe(false);
  });

  it('keeps the settings for meeting summarization', () => {
    expect(
      hasInsightsAiSettingsTabs(
        metadata(
          {
            isAllow: true,
            aiFeatures: { isAllow: true, meetingSummarizationFeatures: { isAllow: true } },
            aiAgentFeatures: aiAgent(),
          },
          { isBreakoutRoom: true },
        ),
      ),
    ).toBe(true);
  });

  it('stays hidden when AI is not allowed at all', () => {
    expect(hasInsightsAiSettingsTabs(metadata({ isAllow: false }))).toBe(false);
    expect(hasInsightsAiSettingsTabs(undefined)).toBe(false);
  });
});
