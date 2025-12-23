import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import Draggable from 'react-draggable';

import { updateIsActiveInsightsAiTextChat } from '../../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch, useAppSelector } from '../../../../store';
import {
  AIMessage,
  MyMessage,
} from '../../../chat/messages/message/messageTypes';
import TextBoxArea from './textBoxArea';
import { PopupCloseSVGIcon } from '../../../../assets/Icons/PopupCloseSVGIcon';
import { ScrollToBottomIconSVG } from '../../../../assets/Icons/ScrollToBottom';

const InsightsAiTextChat = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const nodeRef = useRef(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false);

  const isActive = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveInsightsAiTextChat,
  );
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

  useEffect(() => {
    if (scrollRef.current) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [allMessages, scrollRef]);

  const close = useCallback(() => {
    dispatch(updateIsActiveInsightsAiTextChat(false));
  }, [dispatch]);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (container) {
      // We'll consider the user has scrolled up if they are more than 200px
      // from the bottom. This threshold prevents the button from flickering.
      const isScrolledUp =
        container.scrollHeight - container.clientHeight >
        container.scrollTop + 200;
      // Avoid unnecessary re-renders if the state is already correct.
      if (isScrolledUp !== showScrollDownBtn) {
        setShowScrollDownBtn(isScrolledUp);
      }
    }
  }, [showScrollDownBtn]);

  const forceScrollToBottom = useCallback(() => {
    const container = scrollRef.current;
    if (container) {
      // A small timeout ensures the scroll happens after the panel is fully rendered.
      setTimeout(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, []);

  if (!isEnabled) {
    return null;
  }

  return (
    <div
      className={
        isActive
          ? 'w-full absolute h-full z-10 top-0 left-0 pointer-events-none'
          : 'hidden'
      }
    >
      <div className="ai-chat-widget h-[calc(100%-50px)] mt-9 flex items-end justify-center">
        <Draggable
          handle="#draggable-aichat"
          nodeRef={nodeRef}
          bounds="#main-area"
        >
          <div
            className="h-[500px] w-[400px] min-w-[300px] min-h-[300px] relative pointer-events-auto rounded-xl bg-Gray-25 dark:bg-dark-primary border border-Gray-200 dark:border-Gray-800 resize overflow-auto"
            ref={nodeRef}
          >
            <div className="inner-wrapper relative z-20 w-full h-full flex flex-col">
              <div
                id="draggable-aichat"
                className="absolute top-0 w-full flex items-center justify-between text-base font-medium leading-7 text-Gray-950 dark:text-white px-4 py-2 border-b border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-secondary rounded-t-xl cursor-move"
              >
                <span>{t('insights.ai-text-chat.panel-title')}</span>
                <div className="flex items-center space-x-2">
                  {showScrollDownBtn && (
                    <button
                      className="cursor-pointer relative z-30 transition-opacity"
                      onClick={forceScrollToBottom}
                    >
                      <ScrollToBottomIconSVG />
                    </button>
                  )}
                  <button
                    className="cursor-pointer relative z-30"
                    onClick={close}
                  >
                    <PopupCloseSVGIcon classes="text-Gray-600" />
                  </button>
                </div>
              </div>

              <div className="h-full pt-[45px] flex flex-col">
                <div
                  ref={scrollRef}
                  className="message-list-wrapper relative overflow-auto scrollBar px-3 3xl:px-5 pt-2 xl:pt-3 flex-grow mb-1"
                  onScroll={handleScroll}
                >
                  <div>
                    {allMessages.map((msg) => {
                      if (!msg) return null;

                      const parsedMessage = marked.parse(msg.parts.join(''), {
                        async: false,
                      });
                      const isStreaming =
                        interimMessage !== null && interimMessage.id === msg.id;

                      return (
                        <div
                          key={msg.id}
                          className="wrapper flex gap-2 3xl:gap-3 my-4"
                        >
                          {msg.role === 'model' ? (
                            <AIMessage
                              name={t('insights.ai-text-chat.name')}
                              message={parsedMessage}
                              isStreaming={isStreaming}
                              sentAt={msg.createdAt}
                            />
                          ) : (
                            <MyMessage
                              message={parsedMessage}
                              sentAt={msg.createdAt}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="message-form z-30 border-t border-Gray-200 dark:border-Gray-800 bg-white dark:bg-dark-primary w-full px-3 3xl:px-5 py-2 3xl:py-4 flex items-center shrink-0">
                  <TextBoxArea />
                </div>
              </div>
            </div>
          </div>
        </Draggable>
      </div>
    </div>
  );
};

export default InsightsAiTextChat;
