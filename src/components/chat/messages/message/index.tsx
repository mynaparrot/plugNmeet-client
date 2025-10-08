import React, { memo, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from 'plugnmeet-protocol-js';

import Avatar from './avatar';

import { ICurrentUser } from '../../../../store/slices/interfaces/session';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import { formatDate } from '../../utils';

interface IMessageProps {
  body: ChatMessage;
  currentUser?: ICurrentUser;
}

const SystemMessage = memo(({ message }: { message: string }) => {
  return (
    <div className="content w-full system flex items-center gap-2 text-center my-2">
      <div className="flex-1 border-t border-dashed border-Gray-300" />
      <p
        className="message-content text-xs text-Gray-600 px-2"
        dangerouslySetInnerHTML={{ __html: message }}
      />
      <div className="flex-1 border-t border-dashed border-Gray-300" />
    </div>
  );
});
SystemMessage.displayName = 'SystemMessage';

const MyMessage = memo(
  ({ message, sentAt }: { message: string; sentAt: string }) => {
    const { t } = useTranslation();
    return (
      <div className="content me w-[calc(100%-36px)] 3xl:w-[calc(100%-48px)] ml-auto">
        <div className="name min-h-5 flex items-center text-xs 3xl:text-sm text-Gray-800 font-medium pb-1.5 capitalize justify-between">
          <p>{t('right-panel.you')}</p>
          <p className="time text-xs text-Gray-600">{formatDate(sentAt)}</p>
        </div>
        <p
          className="message-content py-1.5 3xl:py-2.5 px-2.5 3xl:px-3.5 border border-Gray-200 rounded-lg 3xl:rounded-2xl overflow-hidden rounded-br-none text-sm 3xl:text-base text-Gray-950 break-words"
          dangerouslySetInnerHTML={{ __html: message }}
        />
      </div>
    );
  },
);
MyMessage.displayName = 'MyMessage';

const OtherUserMessage = memo(({ body }: { body: ChatMessage }) => {
  const participantName = useAppSelector(
    (state) => participantsSelector.selectById(state, body.fromUserId)?.name,
  );
  const displayName = body.fromName || participantName;

  return (
    <>
      <Avatar userId={body.fromUserId} name={body.fromName} />
      <div className="content w-[calc(100%-36px)] 3xl:w-[calc(100%-48px)] flex-1">
        <div className="name min-h-5 flex items-center text-sm text-Gray-800 font-medium pb-1.5 capitalize justify-between">
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
          className="message-content py-1.5 3xl:py-2.5 px-2.5 3xl:px-3.5 border border-Gray-200 rounded-lg 3xl:rounded-2xl overflow-hidden text-sm 3xl:text-base text-Gray-950 break-words rounded-tl-none bg-Gray-50"
          dangerouslySetInnerHTML={{ __html: body.message }}
        />
      </div>
    </>
  );
});
OtherUserMessage.displayName = 'OtherUserMessage';

const Message = ({ body, currentUser }: IMessageProps) => {
  let content: ReactElement | null;

  if (body.fromUserId === 'system') {
    content = <SystemMessage message={body.message} />;
  } else if (currentUser?.userId === body.fromUserId) {
    content = <MyMessage message={body.message} sentAt={body.sentAt} />;
  } else {
    content = <OtherUserMessage body={body} />;
  }

  return <div className="wrapper flex gap-2 3xl:gap-3">{content}</div>;
};

export default memo(Message);
