import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from 'plugnmeet-protocol-js';

import { ICurrentUser } from '../../../../store/slices/interfaces/session';
import { useAppSelector } from '../../../../store';

import Avatar from './avatar';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IMessageProps {
  body: ChatMessage;
  currentUser?: ICurrentUser;
}
const Message = ({ body, currentUser }: IMessageProps) => {
  const participantName = useAppSelector(
    (state) => participantsSelector.selectById(state, body.fromUserId)?.name,
  );
  const { t } = useTranslation();

  const formatDate = (timeStamp: string) => {
    const date = new Date(Number(timeStamp));
    return date.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const render = () => {
    if (body.fromUserId === 'system') {
      return (
        <>
          {/* System Message Design */}
          <div className="content w-full system">
            <p
              className="message-content py-1.5 3xl:py-2.5 px-2.5 3xl:px-3.5 border border-Gray-200 rounded-lg 3xl:rounded-2xl overflow-hidden text-sm 3xl:text-base text-Gray-950 break-words"
              dangerouslySetInnerHTML={{ __html: body.message }}
            />
          </div>
        </>
      );
    } else if (currentUser?.userId === body.fromUserId) {
      return (
        <>
          {/* Current User Message Design */}
          <div className="content me w-[calc(100%-36px)] 3xl:w-[calc(100%-48px)] ml-auto">
            <div className="name min-h-5 flex items-center text-xs 3xl:text-sm text-Gray-800 font-medium pb-1.5 capitalize justify-between">
              <p>{t('right-panel.you')}</p>
              <p className="time text-xs text-Gray-600">
                {formatDate(body.sentAt)}
              </p>
            </div>
            <p
              className="message-content py-1.5 3xl:py-2.5 px-2.5 3xl:px-3.5 border border-Gray-200 rounded-lg 3xl:rounded-2xl overflow-hidden rounded-br-none text-sm 3xl:text-base text-Gray-950 break-words"
              dangerouslySetInnerHTML={{ __html: body.message }}
            />
          </div>
        </>
      );
    } else {
      return (
        <>
          {/* Others User Message Design */}
          <Avatar userId={body.fromUserId} name={body.fromName} />
          <div className="content w-[calc(100%-36px)] 3xl:w-[calc(100%-48px)] flex-1">
            <div className="name min-h-5 flex items-center text-sm text-Gray-800 font-medium pb-1.5 capitalize justify-between">
              <p>
                {body.fromName ? body.fromName : participantName}
                <span className="text-[10px] pl-1">
                  {participantName ? '' : ' (offline)'}
                </span>
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
    }
  };

  return <div className="wrapper flex gap-2 3xl:gap-3">{render()}</div>;
};

export default Message;
