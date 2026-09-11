import React, { memo, ReactElement } from 'react';
import { ChatMessage } from 'plugnmeet-protocol-js';

import { ICurrentUser } from '../../../../store/slices/interfaces/session';
import { MyMessage, OtherUserMessage, SystemMessage } from './messageTypes';

interface IMessageProps {
  body: ChatMessage;
  chatKey: string;
  currentUser?: ICurrentUser;
  onJumpQuote?: (id: string) => void;
}

const Message = ({
  body,
  chatKey,
  currentUser,
  onJumpQuote,
}: IMessageProps) => {
  let content: ReactElement | null;

  if (body.fromUserId === 'system') {
    content = <SystemMessage message={body.message} />;
  } else if (currentUser?.userId === body.fromUserId) {
    content = (
      <MyMessage
        body={body}
        chatKey={chatKey}
        currentUserId={currentUser?.userId ?? ''}
        isAdmin={!!currentUser?.metadata?.isAdmin}
        onEditStart={() => document.getElementById('message-textarea')?.focus()}
        onJumpQuote={onJumpQuote}
      />
    );
  } else {
    content = (
      <OtherUserMessage
        body={body}
        chatKey={chatKey}
        currentUserId={currentUser?.userId ?? ''}
        isAdmin={!!currentUser?.metadata?.isAdmin}
        onEditStart={() => document.getElementById('message-textarea')?.focus()}
        onJumpQuote={onJumpQuote}
      />
    );
  }

  return <div className="wrapper flex gap-2 3xl:gap-3">{content}</div>;
};

export default memo(Message);
