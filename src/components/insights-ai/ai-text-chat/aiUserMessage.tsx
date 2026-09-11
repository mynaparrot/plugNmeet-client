import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDate } from '../../chat/utils';

interface IAiUserMessageProps {
  message: string;
  sentAt: string;
}

export const AiUserMessage = memo(
  ({ message, sentAt }: IAiUserMessageProps) => {
    const { t } = useTranslation();
    return (
      <div className="content me w-[calc(100%-36px)] 3xl:w-[calc(100%-48px)] ms-auto">
        <div className="name min-h-5 flex items-center text-xs 3xl:text-sm text-Gray-800 dark:text-white font-medium pb-1.5 capitalize justify-between">
          <p>{t('right-panel.you')}</p>
          <p className="time text-xs text-Gray-600 dark:text-dark-text">
            {formatDate(sentAt)}
          </p>
        </div>
        <div
          dir="auto"
          className="message-content py-2 px-2.5 border border-Gray-200 dark:border-Gray-700 rounded-lg overflow-hidden rounded-ee-none text-sm text-Gray-950 dark:text-white break-words markdown-content bg-[#00A1F2]/10 dark:bg-[#00A1F2]/15 border-[#00A1F2]/40"
          dangerouslySetInnerHTML={{ __html: message }}
        />
      </div>
    );
  },
);
AiUserMessage.displayName = 'AiUserMessage';
