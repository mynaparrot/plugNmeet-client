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
        <div className="content w-[calc(100%)] pt-2 system mb-2">
          <p
            className="message-content max-w-fit shadow-footer text-xs bg-primaryColor text-white"
            dangerouslySetInnerHTML={{ __html: body.message }}
          />
        </div>
      );
    } else if (currentUser?.userId === body.fromUserId) {
      return (
        <div className="content me w-[calc(100%-2rem)] pt-2">
          <p className="name pl-2 text-sm pb-1 primaryColor dark:text-darkText">
            {t('right-panel.you')}
          </p>
          <p
            className="message-content max-w-fit shadow-footer text-xs bg-secondaryColor text-white"
            dangerouslySetInnerHTML={{ __html: body.message }}
          />
        </div>
      );
    } else {
      return (
        <>
          <Avatar userId={body.fromUserId} name={body.fromName} />
          <div className="content w-[calc(100%-2rem)] pt-2">
            <p className="name pl-2 text-sm pb-1 dark:text-darkText">
              {body.fromName ? body.fromName : participantName}
              <span style={{ fontSize: '10px' }}>
                {participantName ? '' : ' (offline)'}
              </span>
            </p>
            <p
              className="message-content max-w-fit bg-white shadow-footer text-xs"
              dangerouslySetInnerHTML={{ __html: body.message }}
            />
          </div>
        </>
      );
    }
  };

  return <div className="wrapper flex ">{render()}</div>;
};

export default Message;
