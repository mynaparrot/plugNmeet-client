import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { DB_STORE_NAMES, idbGetAll, idbStore } from '../../../helpers/libs/idb';
import { executeInsightsChatAI } from './helpers/insightsChatAI';

export interface IInsightsAITextChatMessage {
  id: string;
  role: 'user' | 'model';
  createdAt: string;
  parts: string[];
}

export const useAiTextChat = () => {
  const { t } = useTranslation();

  const [finalMessages, setFinalMessages] = useState<
    IInsightsAITextChatMessage[]
  >([]);
  const [interimMessage, setInterimMessage] =
    useState<IInsightsAITextChatMessage | null>(null);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);

  // Hydrate the chat history from IndexedDB once per mount
  useEffect(() => {
    let cancelled = false;
    idbGetAll<IInsightsAITextChatMessage>(DB_STORE_NAMES.INSIGHTS_AI_TEXT_CHATS)
      .then((msgs) => {
        if (cancelled || msgs.length === 0) return;
        const sorted = [...msgs].sort(
          (a, b) => Number(a.createdAt) - Number(b.createdAt),
        );
        setFinalMessages((prev) => (prev.length === 0 ? sorted : prev));
      })
      .catch((e) =>
        console.error('Failed to load insights AI chat history:', e),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

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
        if (parts.length > 0) {
          const modelMsg: IInsightsAITextChatMessage = {
            id: msgId,
            role: 'model',
            createdAt: Date.now().toString(),
            parts,
          };
          setFinalMessages((prev) => [...prev, modelMsg]);
          void idbStore(
            DB_STORE_NAMES.INSIGHTS_AI_TEXT_CHATS,
            modelMsg.id,
            modelMsg,
          );
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
