import React, { useCallback } from 'react';
import { TTDDialog, TTDDialogTrigger } from '@excalidraw/excalidraw';
import type { TTTDDialog } from '@excalidraw/excalidraw/components/TTDDialog/types';
import type { RequestError } from '@excalidraw/excalidraw/errors';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../store';
import { executeWhiteboardAI } from './whiteboardAI';
import { whiteboardPersistenceAdapter } from './whiteboardAIPersistence';

const toRequestError = (message: string, status = 500): RequestError =>
  ({ name: 'RequestError', message, status }) as unknown as RequestError;

interface WhiteboardAIProps {
  canEdit: boolean;
}

const WhiteboardAI = ({ canEdit }: WhiteboardAIProps) => {
  const { t } = useTranslation();
  const aiTextChatFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.aiFeatures?.aiTextChatFeatures,
  );
  const currentUser = useAppSelector((state) => state.session.currentUser);

  const whiteboardAIEnabled =
    !!aiTextChatFeatures?.isEnabled &&
    !aiTextChatFeatures?.isWhiteboardAiDisabled &&
    (aiTextChatFeatures?.isAllowedEveryone ||
      (aiTextChatFeatures?.allowedUserIds ?? []).includes(
        currentUser?.userId ?? '',
      ));

  const onTextSubmit = useCallback<TTTDDialog.onTextSubmit>(
    async ({ messages, onChunk }) => {
      if (!whiteboardAIEnabled) {
        return {
          error: toRequestError(
            t('insights.whiteboard-ai.disabled-message'),
            403,
          ),
          generatedResponse: null,
        };
      }

      const prompt = messages[messages.length - 1]?.content ?? '';
      if (!prompt) {
        return {
          error: toRequestError('Prompt is empty', 400),
          generatedResponse: null,
        };
      }

      // Include the previous Q&A so the model keeps context for follow-up
      // edits. The server handles whiteboard requests as ephemeral (single
      // prompt), so the prior conversation is embedded in the prompt text.
      const previousMessages = messages.slice(0, -1);
      const promptWithContext = previousMessages.length
        ? `${previousMessages
            .map(
              (m) =>
                `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`,
            )
            .join('\n\n')}\n\nUser request:\n${prompt}`
        : prompt;

      try {
        const generatedResponse = await executeWhiteboardAI(
          promptWithContext,
          onChunk,
        );
        return { generatedResponse, error: null };
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : t('insights.ai-text-chat.response-timed-out');
        return {
          error: toRequestError(message, 500),
          generatedResponse: null,
        };
      }
    },
    [t, whiteboardAIEnabled],
  );

  const renderWelcomeScreen = useCallback<TTTDDialog.renderWelcomeScreen>(
    () =>
      !whiteboardAIEnabled ? (
        <div className="w-full rounded-lg border border-Gray-100 bg-white p-3 text-sm text-Gray-600 shadow-xl dark:border-Gray-800 dark:bg-dark-primary dark:text-Gray-300">
          {t('insights.whiteboard-ai.disabled-message')}
        </div>
      ) : undefined,
    [t, whiteboardAIEnabled],
  );

  if (!canEdit) {
    return null;
  }

  return (
    <>
      <TTDDialog
        onTextSubmit={onTextSubmit}
        renderWelcomeScreen={renderWelcomeScreen}
        persistenceAdapter={whiteboardPersistenceAdapter}
      />
      <TTDDialogTrigger />
    </>
  );
};

export default WhiteboardAI;
