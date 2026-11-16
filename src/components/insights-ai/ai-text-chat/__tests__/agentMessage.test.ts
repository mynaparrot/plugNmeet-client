import { beforeEach, describe, expect, it, vi } from 'vitest';
import { create } from '@bufbuild/protobuf';
import {
  InsightsAIRequestSource,
  InsightsAITextChatStreamResultSchema,
} from 'plugnmeet-protocol-js';

/*
 * Messages the AI Agent pushes come from the server with their own id, not
 * from a pending request, so the handler must store them, hand them to any
 * mounted panel, and open the panel to make sure they get seen.
 */

const hoisted = vi.hoisted(() => ({
  isPanelActive: false,
  stored: [] as { storeName: string; key: string; value: { id: string; parts: string[] } }[],
}));

vi.mock('../../../../store', () => ({
  store: {
    getState: () => ({
      bottomIconsActivity: { isActiveInsightsAiTextChat: hoisted.isPanelActive },
    }),
    dispatch: vi.fn(),
  },
}));

vi.mock('../../../../store/slices/bottomIconsActivitySlice', () => ({
  updateIsActiveInsightsAiTextChat: (payload: boolean) => ({
    type: 'bottomIconsActivity/updateIsActiveInsightsAiTextChat',
    payload,
  }),
}));

vi.mock('../../../../helpers/libs/idb', () => ({
  DB_STORE_NAMES: { INSIGHTS_AI_TEXT_CHATS: 'insights-ai-text-chats' },
  idbStore: (storeName: string, key: string, value: { id: string; parts: string[] }) => {
    hoisted.stored.push({ storeName, key, value });
    return Promise.resolve();
  },
}));

vi.mock('../../../../helpers/api/plugNmeetAPI', () => ({ default: vi.fn() }));
vi.mock('../../../../helpers/i18n', () => ({ default: { t: (key: string) => key } }));

const { store } = await import('../../../../store');
const { handleInsightsAIAgentMessage, subscribeToInsightsAIAgentMessages } =
  await import('../helpers/insightsChatAI');

const buildMessage = (over: Record<string, unknown> = {}) =>
  create(InsightsAITextChatStreamResultSchema, {
    id: 'agent-msg-1',
    text: '**Hello** from the assistant',
    isLastChunk: true,
    createdAt: '1700000000000',
    requestFrom: InsightsAIRequestSource.INSIGHTS_AI_REQUEST_SOURCE_AI_AGENT,
    ...over,
  });

describe('handleInsightsAIAgentMessage', () => {
  beforeEach(() => {
    hoisted.isPanelActive = false;
    hoisted.stored.length = 0;
    vi.mocked(store.dispatch).mockClear();
  });

  it('stores the agent message before anyone can lose it', () => {
    handleInsightsAIAgentMessage(buildMessage());

    expect(hoisted.stored).toEqual([
      {
        storeName: 'insights-ai-text-chats',
        key: 'agent-msg-1',
        value: {
          id: 'agent-msg-1',
          role: 'model',
          createdAt: '1700000000000',
          parts: ['**Hello** from the assistant'],
        },
      },
    ]);
  });

  it('notifies a mounted panel in real time', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToInsightsAIAgentMessages(listener);

    handleInsightsAIAgentMessage(buildMessage());

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'agent-msg-1', role: 'model' }),
    );

    unsubscribe();
    handleInsightsAIAgentMessage(buildMessage({ id: 'agent-msg-2' }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('opens the chat panel when it is closed', () => {
    handleInsightsAIAgentMessage(buildMessage());

    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bottomIconsActivity/updateIsActiveInsightsAiTextChat',
        payload: true,
      }),
    );
  });

  it('leaves an already open panel alone', () => {
    hoisted.isPanelActive = true;

    handleInsightsAIAgentMessage(buildMessage());

    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('ignores an agent event without text', () => {
    handleInsightsAIAgentMessage(buildMessage({ text: '   ' }));

    expect(hoisted.stored).toHaveLength(0);
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
