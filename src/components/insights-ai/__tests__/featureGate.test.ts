import { describe, expect, it } from 'vitest';

import type { RootState } from '../../../store';
import type { IRoomMetadata } from '../../../store/slices/interfaces/session';
import {
  hasInsightsAiSettingsTabs,
  isAIAgentChatEnabled,
  isAIAgentSessionRoom,
  isInsightsAiTextChatEnabled,
  selectIsInsightsAiTextChatEnabled,
} from '../featureGate';

/*
 * The AI Chat box is shared by the standalone AI text chat feature and the AI
 * Agent, so the gates have to agree on which one is in charge.
 */

const metadata = (insightsFeatures: unknown, extra: Record<string, unknown> = {}): IRoomMetadata =>
  ({ roomFeatures: { insightsFeatures }, ...extra }) as unknown as IRoomMetadata;

const buildState = (insightsFeatures: unknown) =>
  ({ session: { currentRoom: { metadata: metadata(insightsFeatures) } } }) as unknown as RootState;

const aiAgent = (overrides: Record<string, unknown> = {}) => ({
  isAllow: true,
  allowedParticipantIds: [],
  autoCreatePerUserSession: false,
  ...overrides,
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
      isAIAgentSessionRoom(
        metadata({ aiAgentFeatures: aiAgent({ allowedParticipantIds: ['user_1', 'user_2'] }) }),
      ),
    ).toBe(false);
  });

  it('is on in a parent lobby that assigned a single participant', () => {
    expect(
      isAIAgentSessionRoom(
        metadata({ aiAgentFeatures: aiAgent({ allowedParticipantIds: ['u1'] }) }),
      ),
    ).toBe(true);
  });

  it('is off while per-user sessions are auto-created', () => {
    expect(
      isAIAgentSessionRoom(
        metadata({
          aiAgentFeatures: aiAgent({
            autoCreatePerUserSession: true,
            allowedParticipantIds: ['u1'],
          }),
        }),
      ),
    ).toBe(false);
  });

  it('is on in every breakout room', () => {
    expect(
      isAIAgentSessionRoom(metadata({ aiAgentFeatures: aiAgent() }, { isBreakoutRoom: true })),
    ).toBe(true);
  });
});

describe('isAIAgentChatEnabled', () => {
  it('requires the agent to own the room', () => {
    expect(isAIAgentChatEnabled(undefined)).toBe(false);
    expect(isAIAgentChatEnabled(metadata({ aiAgentFeatures: aiAgent() }))).toBe(false);
    expect(
      isAIAgentChatEnabled(
        metadata(
          { aiAgentFeatures: aiAgent({ allowedParticipantIds: ['u1'] }) },
          { isBreakoutRoom: true },
        ),
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
