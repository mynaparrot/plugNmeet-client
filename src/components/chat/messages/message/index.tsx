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

  const render = () => {
    if (body.fromUserId === 'system') {
      return (
        <>
          <div className="content w-full system my-2">
            <p
              className="message-content py-2.5 px-3.5 border border-Gray-200 rounded-2xl overflow-hidden text-base text-Gray-950 break-words"
              dangerouslySetInnerHTML={{ __html: body.message }}
            />
          </div>
        </>
      );
    } else if (currentUser?.userId === body.fromUserId) {
      return (
        <div className="content me w-[calc(100%-48px)] ml-auto">
          <div className="name min-h-5 flex items-center text-sm text-Gray-800 font-medium pb-1.5 capitalize justify-between">
            <p>{t('right-panel.you')}</p>
            <p className="time text-xs text-Gray-600">8:37AM</p>
          </div>
          <p
            className="message-content py-2.5 px-3.5 border border-Gray-200 rounded-2xl overflow-hidden rounded-br-none text-base text-Gray-950 break-words"
            dangerouslySetInnerHTML={{ __html: body.message }}
          />
        </div>
      );
    } else {
      return (
        <>
          <Avatar userId={body.fromUserId} name={body.fromName} />
          <div className="content w-[calc(100%-48px)] flex-1">
            <div className="name min-h-5 flex items-center text-sm text-Gray-800 font-medium pb-1.5 capitalize justify-between">
              <p>
                {body.fromName ? body.fromName : participantName}
                <span className="text-[10px] pl-1">
                  {participantName ? '' : ' (offline)'}
                </span>
              </p>
              <p className="time text-xs text-Gray-600">8:37AM</p>
            </div>
            <p
              className="message-content py-2.5 px-3.5 border border-Gray-200 rounded-2xl overflow-hidden text-base text-Gray-950 break-words rounded-tl-none bg-Gray-50"
              dangerouslySetInnerHTML={{ __html: body.message }}
            />
          </div>
        </>
      );
    }
  };

  return <div className="wrapper flex gap-3">{render()}</div>;
};

export default Message;
