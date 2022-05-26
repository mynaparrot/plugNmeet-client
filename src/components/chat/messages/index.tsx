import React, { useEffect, useRef } from 'react';

import { useAppSelector, store } from '../../../store';
import { IChatMsg } from '../../../store/slices/interfaces/dataMessages';
import Message from './message';
import { chatMessagesSelector } from '../../../store/slices/chatMessagesSlice';

const Messages = () => {
  const messageRef = useRef<HTMLDivElement>(null);
  const chatMessages = useAppSelector(chatMessagesSelector.selectAll);
  const currentUser = store.getState().session.currentUser;

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest',
      });
    }
  });

  const render = () => {
    return chatMessages.map((msg) => {
      const body = msg as IChatMsg;
      return (
        <Message key={body.message_id} body={body} currentUser={currentUser} />
      );
    });
  };

  return (
    <div className="pb-3" ref={messageRef}>
      {render()}
    </div>
  );
};

export default Messages;
