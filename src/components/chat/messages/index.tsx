import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { debounce } from 'es-toolkit';

import { store, useAppSelector } from '../../../store';
import { chatMessagesSelector } from '../../../store/slices/chatMessagesSlice';
import Message from './message';

interface IMessagesProps {
  userId: string;
}

const Messages = ({ userId }: IMessagesProps) => {
  const allMessages = useAppSelector(chatMessagesSelector.selectAll);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const currentUser = store.getState().session.currentUser;
  const [autoScrollToBottom, setAutoScrollToBottom] = useState<boolean>(true);

  const chatMessages = useMemo(() => {
    if (userId === 'public') {
      return allMessages.filter((m) => !m.isPrivate);
    }
    return allMessages.filter(
      (m) => m.isPrivate && (m.fromUserId === userId || m.toUserId === userId),
    );
  }, [allMessages, userId]);

  const scrollToBottom = useCallback(() => {
    if (autoScrollToBottom && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [autoScrollToBottom]);

  // We debounce the scroll to prevent it from firing on every single message
  // in a rapid burst. It will only scroll once after the messages stop arriving.
  // oxlint-disable-next-line exhaustive-deps
  const debouncedScrollToBottom = useCallback(
    debounce(() => scrollToBottom(), 50),
    [scrollToBottom],
  );

  useEffect(() => {
    // When new messages arrive, trigger the debounced scroll.
    debouncedScrollToBottom();
  }, [chatMessages, debouncedScrollToBottom]);

  const handleScroll = () => {
    const element = messagesContainerRef.current;
    if (element) {
      // Check if the user is at or very near the bottom (with a 1px tolerance)
      const isAtBottom =
        element.scrollHeight - element.scrollTop <= element.clientHeight + 1;
      setAutoScrollToBottom(isAtBottom);
    }
  };

  return (
    <div
      className="relative h-full overflow-auto scrollBar messages-item-wrap px-3 3xl:px-5"
      ref={messagesContainerRef}
      onScroll={handleScroll}
    >
      {chatMessages.map((message) => (
        <div key={message.id} className="message-item py-2">
          <Message body={message} currentUser={currentUser} />
        </div>
      ))}
    </div>
  );
};

export default Messages;
