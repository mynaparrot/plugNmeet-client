import React, { memo, ReactElement } from 'react';
import { ChatMessage } from 'plugnmeet-protocol-js';

import { ICurrentUser } from '../../../../store/slices/interfaces/session';
import { MyMessage, OtherUserMessage, SystemMessage } from './messageTypes';

interface IMessageProps {
  body: ChatMessage;
  currentUser?: ICurrentUser;
}

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
