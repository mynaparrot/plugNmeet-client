import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

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

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Same shape as the old `addAiTextChatUserMessage` reducer.
      setFinalMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'user',
          createdAt: Date.now().toString(),
          parts: [text],
        },
      ]);
      setIsAwaitingResponse(true);

      // Accumulate in the callback closure instead of inside state updaters so
      // React strict mode's double invocation can't duplicate chunks.
      const parts: string[] = [];
      let createdAt = '';
      const msgId = crypto.randomUUID();

      try {
        await executeInsightsChatAI(text, (chunk) => {
          parts.push(chunk);
          if (!createdAt) {
            createdAt = Date.now().toString();
          }
          setInterimMessage({
            id: msgId,
            role: 'model',
            createdAt,
            parts: [...parts],
          });
        });

        setInterimMessage(null);
        if (parts.length > 0) {
          setFinalMessages((prev) => [
            ...prev,
            {
              id: msgId,
              role: 'model',
              createdAt: createdAt || Date.now().toString(),
              parts,
            },
          ]);
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
