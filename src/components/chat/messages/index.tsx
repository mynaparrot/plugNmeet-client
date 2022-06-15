import React, { useEffect, useRef, useState } from 'react';

import { store, useAppSelector } from '../../../store';
import { IChatMsg } from '../../../store/slices/interfaces/dataMessages';
import Message from './message';
import { chatMessagesSelector } from '../../../store/slices/chatMessagesSlice';

interface IMessagesProps {
  userId: string;
}
const Messages = ({ userId }: IMessagesProps) => {
  const allMessages = useAppSelector(chatMessagesSelector.selectAll);
  const messageRef = useRef<HTMLDivElement>(null);
  const currentUser = store.getState().session.currentUser;
  const [chatMessages, setChatMessages] = useState<Array<IChatMsg>>([]);

  useEffect(() => {
    let chatMessages: IChatMsg[] = [];
    if (userId === 'public') {
      chatMessages = allMessages.filter((m) => !m.isPrivate);
    } else {
      chatMessages = allMessages.filter(
        (m) => m.isPrivate && (m.from.userId === userId || m.to === userId),
      );
    }

    setChatMessages(chatMessages);
  }, [allMessages, userId]);

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest',
      });
    }
  }, [chatMessages]);

  const render = () => {
    return chatMessages.map((msg) => {
      const body = msg as IChatMsg;
      return (
        <Message key={body.message_id} body={body} currentUser={currentUser} />
      );
    });
  };

  return (
    <div className="relative h-full px-2 xl:px-4 pt-2 xl:pt-4 overflow-auto scrollBar scrollBar4 messages-item-wrap">
      <div className="inner" ref={messageRef}>
        {render()}
      </div>
    </div>
  );
};

export default Messages;
