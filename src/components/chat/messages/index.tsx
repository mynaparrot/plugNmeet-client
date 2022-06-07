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

    if (chatMessages.length) {
      setChatMessages(chatMessages);
    }
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
    <div className="pb-3" ref={messageRef}>
      {render()}
    </div>
  );
};

export default Messages;
