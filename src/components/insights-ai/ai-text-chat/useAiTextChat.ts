import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { store } from '../../../store';
import { DB_STORE_NAMES, idbGetAll, idbStore } from '../../../helpers/libs/idb';
import { isAIAgentRunning } from '../ai-agent/ui/statusModel';
import { isAIAgentChatEnabled } from '../featureGate';
import {
  executeInsightsChatAI,
  subscribeToInsightsAIAgentMessages,
} from './helpers/insightsChatAI';
import type { IInsightsAITextChatMessage } from './types';

const mergeMessages = (
  current: IInsightsAITextChatMessage[],
  incoming: IInsightsAITextChatMessage[],
): IInsightsAITextChatMessage[] => {
  const knownIds = new Set(current.map((msg) => msg.id));
  const merged = [...current, ...incoming.filter((msg) => !knownIds.has(msg.id))];
  if (merged.length === current.length) {
    return current;
  }
  return merged.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
};

export const useAiTextChat = () => {
  const { t } = useTranslation();

  const [finalMessages, setFinalMessages] = useState<IInsightsAITextChatMessage[]>([]);
  const [interimMessage, setInterimMessage] = useState<IInsightsAITextChatMessage | null>(null);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);

  // Hydrate the chat history from IndexedDB once per mount
  useEffect(() => {
    let cancelled = false;
    idbGetAll<IInsightsAITextChatMessage>(DB_STORE_NAMES.INSIGHTS_AI_TEXT_CHATS)
      .then((msgs) => {
        if (cancelled || msgs.length === 0) return;
        setFinalMessages((prev) => mergeMessages(prev, msgs));
      })
      .catch((e) => console.error('Failed to load insights AI chat history:', e));
    return () => {
      cancelled = true;
    };
  }, []);

  // The AI Agent writes to the chat box on its own, outside any pending request
  useEffect(
    () =>
      subscribeToInsightsAIAgentMessages((message) => {
        setFinalMessages((prev) => mergeMessages(prev, [message]));
      }),
    [],
  );

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const { session, aiAgent } = store.getState();
      if (isAIAgentChatEnabled(session.currentRoom?.metadata) && !isAIAgentRunning(aiAgent.agent)) {
        toast(t('ai-agent.errors.session-not-started'), { type: 'error' });
        return;
      }

      // Same shape as the old `addAiTextChatUserMessage` reducer.
      const userMsg: IInsightsAITextChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        createdAt: Date.now().toString(),
        parts: [text],
      };
      setFinalMessages((prev) => [...prev, userMsg]);
      void idbStore(DB_STORE_NAMES.INSIGHTS_AI_TEXT_CHATS, userMsg.id, userMsg);
      setIsAwaitingResponse(true);

      // Accumulate in the callback closure instead of inside state updaters so
      // React strict mode's double invocation can't duplicate chunks.
      const parts: string[] = [];
      const msgId = crypto.randomUUID();

      try {
        await executeInsightsChatAI(text, (chunk) => {
          parts.push(chunk);
          setInterimMessage({
            id: msgId,
            role: 'model',
            createdAt: Date.now().toString(),
            parts: [...parts],
          });
        });

        setInterimMessage(null);
        // The AI Agent answers with `send_chat_message`, so an empty ack is expected
        if (parts.length > 0) {
          const modelMsg: IInsightsAITextChatMessage = {
            id: msgId,
            role: 'model',
            createdAt: Date.now().toString(),
            parts,
          };
          setFinalMessages((prev) => [...prev, modelMsg]);
          void idbStore(DB_STORE_NAMES.INSIGHTS_AI_TEXT_CHATS, modelMsg.id, modelMsg);
        }
      } catch (err) {
        toast(t(err instanceof Error ? err.message : String(err)), {
          type: 'error',
        });
        // Keep any partial interim message visible — matches previous behavior.
      } finally {
        setIsAwaitingResponse(false);
      }
    },
    [t],
  );

  return {
    finalMessages,
    interimMessage,
    isAwaitingResponse,
    send,
  };
};
