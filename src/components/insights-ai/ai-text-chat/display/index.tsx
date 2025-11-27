import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useVirtual from 'react-cool-virtual';
import { marked } from 'marked';

import { setActiveSidePanel } from '../../../../store/slices/bottomIconsActivitySlice';
import { CloseIconSVG } from '../../../../assets/Icons/CloseIconSVG';
import { useAppDispatch, useAppSelector } from '../../../../store';
import {
  AIMessage,
  MyMessage,
} from '../../../chat/messages/message/messageTypes';
import TextBoxArea from './textBoxArea';

const InsightsAiTextChat = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const finalMessages = useAppSelector(
    (state) => state.insightsAiTextChat.finalMessages,
  );
  const interimMessage = useAppSelector(
    (state) => state.insightsAiTextChat.interimMessage,
  );
  const isEnabled = useAppSelector(
    (state) =>
      state.session.currentRoom?.metadata?.roomFeatures?.insightsFeatures
        ?.aiFeatures?.aiTextChatFeatures?.isEnabled,
  );

  const allMessages = useMemo(() => {
    const messages = [...finalMessages];
    if (interimMessage) {
      messages.push(interimMessage);
    }
    return messages;
  }, [finalMessages, interimMessage]);

  const { outerRef, innerRef, items } = useVirtual({
    itemCount: allMessages.length,
  });

  // Auto-scroll to the bottom when new messages are added or streaming.
  useEffect(() => {
    if (outerRef.current) {
      // Use a timeout to ensure the DOM has updated before we try to scroll.
      // This is the key to fixing the scrolling issue during streaming.
      const timer = setTimeout(() => {
        if (outerRef.current) {
          outerRef.current.scrollTop = outerRef.current.scrollHeight;
        }
      }, 100); // A small delay is often necessary.

      return () => clearTimeout(timer);
    }
  }, [allMessages, outerRef]);

  const close = useCallback(() => {
    dispatch(setActiveSidePanel(null));
  }, [dispatch]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="relative z-10 w-full bg-Gray-25 border-l border-Gray-200 h-full">
      <div
        className="inline-block absolute z-50 right-3 3xl:right-5 top-[10px] 3xl:top-[18px] text-Gray-600 cursor-pointer"
        onClick={close}
      >
        <CloseIconSVG />
      </div>
      <div className="inner-wrapper relative z-20 w-full h-full flex flex-col">
        <div className="top flex items-center h-10 3xl:h-14 px-3 3xl:px-5 border-b border-Gray-200 shrink-0">
          <p className="text-sm 3xl:text-base text-Gray-950 font-medium leading-tight">
            {t('insights.ai-text-chat.panel-title')}
          </p>
        </div>

        <div
          ref={outerRef as any}
          className="message-list-wrapper relative overflow-auto scrollBar px-3 3xl:px-5 pt-2 xl:pt-3 flex-grow mb-1"
        >
          <div ref={innerRef as any}>
            {items.map(({ index, measureRef }) => {
              const msg = allMessages[index];
              if (!msg) return null;

              const parsedMessage = marked.parse(msg.parts.join(''));
              const isStreaming =
                interimMessage !== null && interimMessage.id === msg.id;

              return (
                <div
                  key={msg.id}
                  ref={measureRef}
                  className="wrapper flex gap-2 3xl:gap-3 my-4"
                >
                  {msg.role === 'model' ? (
                    <AIMessage
                      name={t('insights.ai-text-chat.name')}
                      message={parsedMessage as string}
                      isStreaming={isStreaming}
                      sentAt={msg.createdAt}
                    />
                  ) : (
                    <MyMessage
                      message={parsedMessage as string}
                      sentAt={msg.createdAt}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="message-form z-30 border-t border-Gray-200 bg-white w-full px-3 3xl:px-5 py-2 3xl:py-4 flex items-center shrink-0">
          <TextBoxArea />
        </div>
      </div>
    </div>
  );
};

export default InsightsAiTextChat;
