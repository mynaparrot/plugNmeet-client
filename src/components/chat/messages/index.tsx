import React, { useEffect, useRef, useState } from 'react';
import useVirtual from 'react-cool-virtual';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, store, useAppSelector } from '../../../store';
import { IChatMsg } from '../../../store/slices/interfaces/dataMessages';
import { chatMessagesSelector } from '../../../store/slices/chatMessagesSlice';
import Message from './message';

interface IMessagesProps {
  userId: string;
}

const isActiveChatPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.isActiveChatPanel,
);

const Messages = ({ userId }: IMessagesProps) => {
  const allMessages = useAppSelector(chatMessagesSelector.selectAll);
  const isActiveChatPanel = useAppSelector(isActiveChatPanelSelector);

  const scrollToRef = useRef<HTMLDivElement>(null);
  const currentUser = store.getState().session.currentUser;
  const [chatMessages, setChatMessages] = useState<Array<IChatMsg>>([]);
  const [autoScrollToBottom, setAutoScrollToBottom] = useState<boolean>(true);

  const { outerRef, innerRef, items, scrollToItem } = useVirtual({
    itemCount: chatMessages.length,
    onScroll: (event) => {
      if (event.visibleStopIndex === chatMessages.length - 1) {
        setAutoScrollToBottom(true);
      } else {
        setAutoScrollToBottom(false);
      }
    },
  });

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

  const scrollToBottom = () => {
    if (!chatMessages.length || !autoScrollToBottom) {
      return;
    }
    if (scrollToRef.current) {
      scrollToItem(
        {
          index: chatMessages.length - 1,
          smooth: true,
        },
        () => {
          if (scrollToRef.current) {
            scrollToRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'end',
              inline: 'nearest',
            });
          }
        },
      );
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollToBottom();
    }, 500);
    return () => {
      clearTimeout(timeout);
    };
    //eslint-disable-next-line
  }, [chatMessages.length]);

  // if we don't do this then scrolling won't go to bottom
  useEffect(() => {
    if (isActiveChatPanel) {
      setTimeout(() => {
        scrollToBottom();
      }, 500);
    }
    //eslint-disable-next-line
  }, [isActiveChatPanel]);

  const renderMsg = (index) => {
    if (!chatMessages.length || typeof chatMessages[index] === 'undefined') {
      return null;
    }
    const body = chatMessages[index] as IChatMsg;
    return (
      <Message key={body.message_id} body={body} currentUser={currentUser} />
    );
  };

  return (
    <div
      className="relative h-full px-2 xl:px-4 pt-2 xl:pt-4 overflow-auto scrollBar scrollBar4 messages-item-wrap"
      ref={outerRef as any}
    >
      <div ref={innerRef as any} className="inner">
        {items.map(({ index, measureRef }) => (
          <div
            key={index}
            ref={measureRef}
            className="message-item mb-2 xl:mb-3"
          >
            {renderMsg(index)}
          </div>
        ))}
        <div ref={scrollToRef} />
      </div>
    </div>
  );
};

export default Messages;
