import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PollDataWithOption, publishPollAICheckByChat } from '../../utils';
import { analyzePollTextAnswersWithAI } from '../../create/pollAI';
import useIsPollAIEnabled from '../../hooks/useIsPollAIEnabled';
import { useAppDispatch } from '../../../../store';
import { addUserNotification } from '../../../../store/slices/roomSettingsSlice';
import ActionButton from '../../../../helpers/ui/actionButton';
import { DB_STORE_NAMES, idbGet, idbStore } from '../../../../helpers/libs/idb';

interface AICheckProps {
  pollDataWithOption: PollDataWithOption;
}

const getAICheckCacheKey = (pollId: string) => `poll_ai_check_${pollId}`;

const AICheck = ({ pollDataWithOption }: AICheckProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const pollAIEnabled = useIsPollAIEnabled();
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');

  useEffect(() => {
    let active = true;
    idbGet<string>(DB_STORE_NAMES.USER_SETTINGS, getAICheckCacheKey(pollDataWithOption.pollId))
      .then((cached) => {
        if (active && typeof cached === 'string' && cached.trim() !== '') {
          setAiAnalysis(cached);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pollDataWithOption.pollId]);

  const runCheck = async () => {
    if (isLoading || !pollAIEnabled || pollDataWithOption.totalRespondents <= 0) {
      return;
    }
    setIsLoading(true);
    try {
      // Only answer text and counts leave the client — never names or IDs.
      const answers = Object.values(pollDataWithOption.options).map((option) => ({
        text: option.text,
        count: option.votes,
      }));
      const result = await analyzePollTextAnswersWithAI(pollDataWithOption.question, answers);
      setAiAnalysis(result);
      void idbStore(
        DB_STORE_NAMES.USER_SETTINGS,
        getAICheckCacheKey(pollDataWithOption.pollId),
        result,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      dispatch(
        addUserNotification({
          message: t(message || 'polls.errors.generic'),
          typeOption: 'error',
        }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const shareInChat = async () => {
    if (isSharing) {
      return;
    }
    setIsSharing(true);
    try {
      await publishPollAICheckByChat(pollDataWithOption.question, aiAnalysis);
      dispatch(
        addUserNotification({
          message: t('polls.notifications.ai-shared-chat'),
          typeOption: 'info',
        }),
      );
    } catch {
      dispatch(
        addUserNotification({
          message: t('polls.errors.generic'),
          typeOption: 'error',
        }),
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="px-5 pb-5">
      <div className="flex items-center justify-between gap-3">
        {!pollAIEnabled ? (
          <p className="text-xs text-Gray-600 dark:text-Gray-300 flex-1">
            {t('polls.ai-disabled-notice')}
          </p>
        ) : (
          <div />
        )}
        <ActionButton
          onClick={runCheck}
          isLoading={isLoading}
          disabled={!pollAIEnabled || pollDataWithOption.totalRespondents <= 0}
          buttonType="button"
          custom="w-auto px-4 shrink-0"
        >
          {aiAnalysis ? t('polls.ai-recheck-answers') : t('polls.ai-check-answers')}
        </ActionButton>
      </div>
      {aiAnalysis && (
        <div className="mt-3 grid gap-2">
          <div className="max-h-48 overflow-y-auto scrollBar scrollBar2 whitespace-pre-line text-sm text-Gray-800 dark:text-white bg-Blue2-50/50 dark:bg-dark-secondary2 border border-Blue2-200 dark:border-Gray-700 rounded-xl p-3">
            {aiAnalysis.trim()}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={shareInChat}
              disabled={isSharing}
              className="h-8 px-3 cursor-pointer rounded-[11px] text-xs md:text-sm font-semibold bg-Gray-50 hover:bg-Gray-100 dark:bg-Gray-800 dark:hover:bg-dark-secondary2 text-Gray-800 dark:text-white border border-Gray-300 dark:border-Gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('polls.ai-share-chat')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICheck;
