import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from 'plugnmeet-protocol-js';

import { formatDate } from '../../utils';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import Avatar from './avatar';
import { AiIconSVG } from '../../../../assets/Icons/AiIconSVG';

export const SystemMessage = memo(({ message }: { message: string }) => {
  return (
    <div className="content w-full system flex items-center gap-2 text-center my-2">
      <div className="flex-1 border-t border-dashed border-Gray-300 dark:border-Gray-800" />
      <p
        className="message-content text-xs text-Gray-600 dark:text-dark-text px-2"
        dangerouslySetInnerHTML={{ __html: message }}
      />
      <div className="flex-1 border-t border-dashed border-Gray-300 dark:border-Gray-800" />
    </div>
  );
});
SystemMessage.displayName = 'SystemMessage';

export const MyMessage = memo(
  ({ message, sentAt }: { message: string; sentAt: string }) => {
    const { t } = useTranslation();
    return (
      <div className="content me w-[calc(100%-36px)] 3xl:w-[calc(100%-48px)] ml-auto">
        <div className="name min-h-5 flex items-center text-xs 3xl:text-sm text-Gray-800 dark:text-white font-medium pb-1.5 capitalize justify-between">
          <p>{t('right-panel.you')}</p>
          <p className="time text-xs text-Gray-600 dark:text-dark-text">
            {formatDate(sentAt)}
          </p>
        </div>
        <p
          className="message-content py-2 px-2.5 border border-Gray-200 dark:border-Gray-700 rounded-lg overflow-hidden rounded-br-none text-sm text-Gray-950 dark:text-white break-words"
          dangerouslySetInnerHTML={{ __html: message }}
        />
      </div>
    );
  },
);
MyMessage.displayName = 'MyMessage';

export const OtherUserMessage = memo(({ body }: { body: ChatMessage }) => {
  const participantName = useAppSelector(
    (state) => participantsSelector.selectById(state, body.fromUserId)?.name,
  );
  const displayName = body.fromName || participantName;

  return (
    <>
      <Avatar userId={body.fromUserId} name={body.fromName} />
      <div className="content w-[calc(100%-36px)] 3xl:w-[calc(100%-48px)] flex-1">
        <div className="name min-h-5 flex items-center text-sm text-Gray-800 dark:text-white font-medium pb-1.5 capitalize justify-between">
          <p>
            {displayName}
            {!participantName && (
              <span className="text-[10px] pl-1">(offline)</span>
            )}
          </p>
          <p className="time text-xs text-Gray-600">
            {formatDate(body.sentAt)}
          </p>
        </div>
        <p
          className="message-content py-2 px-2.5 border border-Gray-200 dark:border-Gray-700 rounded-lg overflow-hidden text-sm text-Gray-950 dark:text-white break-words rounded-tl-none bg-Gray-50 dark:bg-Gray-800"
          dangerouslySetInnerHTML={{ __html: body.message }}
        />
      </div>
    </>
  );
});
OtherUserMessage.displayName = 'OtherUserMessage';

export const AIMessage = memo(
  ({
    name,
    message,
    sentAt,
    isStreaming,
  }: {
    name: string;
    message: string;
    sentAt: string;
    isStreaming: boolean;
  }) => {
    return (
      <>
        <div className="thumb h-7 3xl:h-9 w-7 3xl:w-9 rounded-lg 3xl:rounded-xl bg-primary-color text-white flex items-center justify-center overflow-hidden shrink-0">
          <span className="h-4 w-4 3xl:h-5 3xl:w-5">
            <AiIconSVG classes="w-full h-full" />
          </span>
        </div>
        <div className="content w-[calc(100%-36px)] 3xl:w-[calc(100%-48px)] flex-1">
          <div className="name min-h-5 flex items-center text-sm text-Gray-800 dark:text-white font-medium pb-1.5 capitalize justify-between">
            <p>{name}</p>
            <p className="time text-xs text-Gray-600 dark:text-dark-text">
              {formatDate(sentAt)}
            </p>
          </div>
          <div className="message-content py-2 px-2.5 border border-Gray-200 dark:border-Gray-700 rounded-lg overflow-hidden text-sm text-Gray-950 dark:text-white break-words rounded-tl-none bg-Gray-50 dark:bg-Gray-800">
            <div
              className="break-words"
              dangerouslySetInnerHTML={{ __html: message }}
            />
            {isStreaming && (
              <span className="blinking-cursor inline-block h-4 w-0.5 ml-1 bg-gray-900" />
            )}
          </div>
        </div>
      </>
    );
  },
);
AIMessage.displayName = 'AIMessage';
