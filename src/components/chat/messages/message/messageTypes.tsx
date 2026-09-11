import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDate, getPlainTextSnippet } from '../../utils';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import { selectMessageById } from '../../../../store/slices/chatMessagesSlice';
import Avatar from './avatar';
import MessageActions from './messageActions';
import { AiIconSVG } from '../../../../assets/Icons/AiIconSVG';
import { cleanHtmlForChat } from '../../../../helpers/utils';
import { IBubbleProps, IReplyQuoteProps } from './types';

export const SystemMessage = memo(({ message }: { message: string }) => {
  return (
    <div className="content w-full system flex items-center gap-2 text-center my-2">
      <div className="flex-1 border-t border-dashed border-Gray-300 dark:border-Gray-800" />
      <div
        dir="auto"
        className="message-content text-xs text-Gray-600 dark:text-dark-text px-2"
        dangerouslySetInnerHTML={{ __html: cleanHtmlForChat(message) }}
      />
      <div className="flex-1 border-t border-dashed border-Gray-300 dark:border-Gray-800" />
    </div>
  );
});
SystemMessage.displayName = 'SystemMessage';

export const ReplyQuote = memo(
  ({
    replyToId,
    replyToName,
    replyToText,
    chatKey,
    onJump,
  }: IReplyQuoteProps) => {
    const liveOriginal = useAppSelector((state) =>
      replyToId ? selectMessageById(state, chatKey, replyToId) : undefined,
    );
    const text =
      liveOriginal && !liveOriginal.meta?.isDeleted
        ? getPlainTextSnippet(liveOriginal.message, 120)
        : (replyToText ?? '');
    const name = liveOriginal?.fromName ?? replyToName ?? '';
    if (!replyToId) {
      return null;
    }
    const inner = (
      <>
        <p className="text-[11px] font-semibold text-[#00A1F2] truncate">
          {name}
        </p>
        <p className="text-xs text-Gray-600 dark:text-dark-text truncate">
          {text}
        </p>
      </>
    );
    return (
      <button
        type="button"
        dir="auto"
        onClick={() => replyToId && onJump?.(replyToId)}
        className="mb-1.5 block w-full text-start border-s-2 border-[#00A1F2] bg-Gray-50 dark:bg-Gray-800 rounded-e-lg px-2 py-1 cursor-pointer hover:bg-Gray-100 dark:hover:bg-Gray-700 focus-ring"
      >
        {inner}
      </button>
    );
  },
);
ReplyQuote.displayName = 'ReplyQuote';

const DeletedPlaceholder = ({
  isMine,
  deletedBy,
  currentUserId,
}: {
  isMine: boolean;
  deletedBy?: string;
  currentUserId: string;
}) => {
  const { t } = useTranslation();
  const deletedByAdmin = !!deletedBy && deletedBy !== currentUserId;
  const label = deletedByAdmin
    ? t('right-panel.message-deleted-by-admin')
    : isMine
      ? t('right-panel.message-deleted-by-you')
      : t('right-panel.message-deleted');
  return (
    <p className="text-xs italic text-Gray-500 dark:text-dark-text">{label}</p>
  );
};

const EditedMark = ({
  editedAt,
  title,
}: {
  editedAt?: string;
  title?: string;
}) => {
  const { t } = useTranslation();
  if (!editedAt) {
    return null;
  }
  return (
    <span
      className="ps-1 text-[10px] font-normal normal-case text-Gray-500 dark:text-dark-text"
      title={title ?? t('right-panel.edited-at-title')}
    >
      ({t('right-panel.edited')})
    </span>
  );
};

interface IMyMessageProps extends IBubbleProps {
  markdown?: boolean;
}

export const MyMessage = memo(
  ({
    body,
    chatKey,
    currentUserId,
    isAdmin,
    onEditStart,
    onJumpQuote,
    markdown = false,
  }: IMyMessageProps) => {
    const { t } = useTranslation();
    const isDeleted = !!body.meta?.isDeleted;
    return (
      <div className="content me w-[calc(100%-36px)] 3xl:w-[calc(100%-48px)] ms-auto relative">
        <div className="name min-h-5 flex items-center text-xs 3xl:text-sm text-Gray-800 dark:text-white font-medium pb-1.5 capitalize justify-between">
          <p>{t('right-panel.you')}</p>
          <div className="flex items-center gap-1">
            <p className="time text-xs text-Gray-600 dark:text-dark-text">
              {formatDate(body.sentAt)}
              <EditedMark editedAt={body.meta?.editedAt} />
            </p>
            <MessageActions
              body={body}
              chatKey={chatKey}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onEditStart={onEditStart}
            />
          </div>
        </div>
        <div
          dir="auto"
          className={`message-content py-2 px-2.5 border border-Gray-200 dark:border-Gray-700 rounded-lg overflow-hidden rounded-ee-none text-sm text-Gray-950 dark:text-white break-words${
            markdown
              ? ' markdown-content bg-[#00A1F2]/10 dark:bg-[#00A1F2]/15 border-[#00A1F2]/40'
              : ''
          }`}
        >
          {!isDeleted && body.meta?.replyToId && (
            <ReplyQuote
              replyToId={body.meta.replyToId}
              replyToName={body.meta.replyToName}
              replyToText={body.meta.replyToText}
              chatKey={chatKey}
              onJump={onJumpQuote}
            />
          )}
          {isDeleted ? (
            <DeletedPlaceholder
              isMine
              deletedBy={body.meta?.deletedBy}
              currentUserId={currentUserId}
            />
          ) : (
            <div
              dir="auto"
              dangerouslySetInnerHTML={{
                __html: markdown
                  ? body.message
                  : cleanHtmlForChat(body.message),
              }}
            />
          )}
        </div>
      </div>
    );
  },
);
MyMessage.displayName = 'MyMessage';

export const OtherUserMessage = memo(
  ({
    body,
    chatKey,
    currentUserId,
    isAdmin,
    onEditStart,
    onJumpQuote,
  }: IBubbleProps) => {
    const participantName = useAppSelector(
      (state) => participantsSelector.selectById(state, body.fromUserId)?.name,
    );
    const displayName = body.fromName || participantName;
    const isDeleted = !!body.meta?.isDeleted;

    return (
      <>
        <Avatar userId={body.fromUserId} name={body.fromName} />
        <div className="content w-[calc(100%-36px)] 3xl:w-[calc(100%-48px)] flex-1 relative">
          <div className="name min-h-5 flex items-center text-sm text-Gray-800 dark:text-white font-medium pb-1.5 capitalize justify-between">
            <p>
              {displayName}
              {!participantName && (
                <span className="text-[10px] pl-1">(offline)</span>
              )}
            </p>
            <div className="flex items-center gap-1">
              <p className="time text-xs text-Gray-600">
                {formatDate(body.sentAt)}
                <EditedMark editedAt={body.meta?.editedAt} />
              </p>
              <MessageActions
                body={body}
                chatKey={chatKey}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onEditStart={onEditStart}
              />
            </div>
          </div>
          <div
            dir="auto"
            className="message-content py-2 px-2.5 border border-Gray-200 dark:border-Gray-700 rounded-lg overflow-hidden text-sm text-Gray-950 dark:text-white break-words rounded-ss-none bg-Gray-50 dark:bg-Gray-800"
          >
            {!isDeleted && body.meta?.replyToId && (
              <ReplyQuote
                replyToId={body.meta.replyToId}
                replyToName={body.meta.replyToName}
                replyToText={body.meta.replyToText}
                chatKey={chatKey}
                onJump={onJumpQuote}
              />
            )}
            {isDeleted ? (
              <DeletedPlaceholder
                isMine={false}
                deletedBy={body.meta?.deletedBy}
                currentUserId={currentUserId}
              />
            ) : (
              <div
                dir="auto"
                dangerouslySetInnerHTML={{
                  __html: cleanHtmlForChat(body.message),
                }}
              />
            )}
          </div>
        </div>
      </>
    );
  },
);
OtherUserMessage.displayName = 'OtherUserMessage';

export const AIMessage = memo(
  ({
    name,
    message,
    sentAt,
    isStreaming,
    markdown = false,
  }: {
    name: string;
    message: string;
    sentAt: string;
    isStreaming: boolean;
    markdown?: boolean;
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
          <div className="message-content py-2 px-2.5 border border-Gray-200 dark:border-Gray-700 rounded-lg overflow-hidden text-sm text-Gray-950 dark:text-white break-words rounded-ss-none bg-Gray-50 dark:bg-Gray-800">
            <div
              dir="auto"
              className={`break-words${markdown ? ' markdown-content' : ''}`}
              dangerouslySetInnerHTML={{
                __html: markdown ? message : cleanHtmlForChat(message),
              }}
            />
            {isStreaming && (
              <span className="blinking-cursor inline-block h-4 w-0.5 ms-1 bg-gray-900" />
            )}
          </div>
        </div>
      </>
    );
  },
);
AIMessage.displayName = 'AIMessage';
