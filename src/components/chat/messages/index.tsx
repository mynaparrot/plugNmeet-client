import React, {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { debounce } from 'es-toolkit';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { selectMessagesByKeyValue } from '../../../store/slices/chatMessagesSlice';
import Message from './message';
import { setActiveSidePanel } from '../../../store/slices/bottomIconsActivitySlice';
import { getRecorderBotOptions } from '../../../helpers/utils';
import { ScrollToBottomIconSVG } from '../../../assets/Icons/ScrollToBottom';

interface IMessagesProps {
  messageKey: string;
  isRecorder: boolean;
}

// Distance from the bottom (px) within which the user still counts as "at the bottom".
const NEAR_BOTTOM_THRESHOLD_PX = 200;

// Number of most-recent messages rendered at once. Older history is loaded in
// batches via the "load earlier messages" button; the store keeps everything.
const CHAT_WINDOW_SIZE = 100;

const scrollAndHighlight = (target: HTMLElement) => {
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  target.classList.add('ring-2', 'ring-[#00A1F2]', 'rounded-lg');
  setTimeout(() => {
    target.classList.remove('ring-2', 'ring-[#00A1F2]', 'rounded-lg');
  }, 1200);
};

const isNearBottom = (el: HTMLUListElement) =>
  el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_THRESHOLD_PX;

const Messages = ({ messageKey, isRecorder }: IMessagesProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const recorderBotOptions = useMemo(() => {
    const session = store.getState().session;
    if (
      session.currentUser?.userId &&
      session.currentRoom?.metadata?.roomFeatures
    ) {
      return getRecorderBotOptions(
        session.currentUser.userId,
        session.currentRoom.metadata.roomFeatures,
      );
    }
  }, []);

  const chatMessages = useAppSelector((state) =>
    selectMessagesByKeyValue(state, messageKey),
  );
  const unreadCount = useAppSelector(
    (state) => state.bottomIconsActivity.totalUnreadChatMsgs,
  );

  const messagesContainerRef = useRef<HTMLUListElement>(null);
  const currentUser = store.getState().session.currentUser;
  // Whether the viewport is scrolled to the bottom. The FAB shows only when
  // this is false, i.e. the user scrolled up by more than the threshold.
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const atBottomRef = useRef(true);
  // id of the first message that arrived while the user was scrolled up
  const [dividerId, setDividerId] = useState<string | null>(null);
  const prevLengthRef = useRef(chatMessages.length);
  // Index into chatMessages where the rendered window starts. While the user is
  // at the bottom the window slides forward (capped at CHAT_WINDOW_SIZE); while
  // they are scrolled up it stays anchored so incoming messages never shift
  // what they are reading.
  const [windowStart, setWindowStart] = useState(() =>
    Math.max(0, chatMessages.length - CHAT_WINDOW_SIZE),
  );
  // Captured list metrics before a window growth, to restore scroll position.
  const pendingScrollAdjustRef = useRef<{
    scrollTop: number;
    scrollHeight: number;
  } | null>(null);
  // A quote-jump target that needed the window grown; scrolled to after render.
  const pendingJumpRef = useRef<string | null>(null);
  // Instant jump on mount/tab switch; smooth scroll afterwards.
  const instantScrollRef = useRef(true);

  // Reset tab-scoped state during render so a new tab's first commit is already windowed.
  const [prevMessageKey, setPrevMessageKey] = useState(messageKey);
  if (messageKey !== prevMessageKey) {
    setPrevMessageKey(messageKey);
    setDividerId(null);
    setIsAtBottom(true);
    setWindowStart(Math.max(0, chatMessages.length - CHAT_WINDOW_SIZE));
    atBottomRef.current = true;
    prevLengthRef.current = chatMessages.length;
    instantScrollRef.current = true;
  }

  // Latest-refs keep handleJumpToMessage identity-stable so Message memo holds.
  const chatMessagesRef = useRef(chatMessages);
  const windowStartRef = useRef(windowStart);
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
    windowStartRef.current = windowStart;
  }, [chatMessages, windowStart]);

  // Timer logic for recorder
  useEffect(() => {
    if (
      !isRecorder ||
      !recorderBotOptions?.enableAutoCloseChatPanel ||
      !recorderBotOptions.durationAfterLastMessage
    ) {
      return;
    }

    const timer = setTimeout(() => {
      dispatch(setActiveSidePanel(null));
    }, recorderBotOptions.durationAfterLastMessage * 1000);

    // Clear the timer if a new message arrives or the component unmounts
    return () => {
      clearTimeout(timer);
    };
  }, [chatMessages, isRecorder, recorderBotOptions, dispatch]);

  // Cap the rendered window while at the bottom; freeze it while scrolled up.
  useEffect(() => {
    if (isAtBottom) {
      setWindowStart(Math.max(0, chatMessages.length - CHAT_WINDOW_SIZE));
    }
  }, [isAtBottom, chatMessages.length]);

  const setAtBottom = useCallback((atBottom: boolean) => {
    atBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, []);

  // Mark the first new message that arrives while scrolled up
  useEffect(() => {
    if (chatMessages.length > prevLengthRef.current) {
      if (!atBottomRef.current && dividerId === null) {
        const firstNew = chatMessages[prevLengthRef.current];
        if (firstNew) {
          setDividerId(firstNew.id);
        }
      }
    }
    prevLengthRef.current = chatMessages.length;
  }, [chatMessages, dividerId]);

  const scrollToBottom = useCallback(() => {
    // Only stick to the bottom when the user is already scrolled there.
    // Reading from the ref (not state) avoids stale closures inside debounce.
    const instant = instantScrollRef.current;
    instantScrollRef.current = false;
    if (atBottomRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth',
      });
    }
  }, []);

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

  // Re-check bottom state after new messages render at the bottom.
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el && isNearBottom(el) && !atBottomRef.current) {
      setAtBottom(true);
      setDividerId(null);
    }
  }, [chatMessages, setAtBottom]);

  const forceScrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    setAtBottom(true);
    setDividerId(null);
  }, [setAtBottom]);

  const handleScroll = () => {
    const element = messagesContainerRef.current;
    if (element) {
      const nearBottom = isNearBottom(element);
      setAtBottom(nearBottom);
      if (nearBottom) {
        setDividerId(null);
      }
    }
  };

  const handleJumpToMessage = useCallback((id: string) => {
    const el = document.getElementById(`chat-msg-${id}`);
    if (el) {
      scrollAndHighlight(el);
      return;
    }
    // Target is older than the rendered window: grow the window to include
    // it, then scroll after the DOM updates.
    const idx = chatMessagesRef.current.findIndex((m) => m.id === id);
    if (idx < 0 || idx >= windowStartRef.current) {
      return;
    }
    pendingJumpRef.current = id;
    setWindowStart(Math.max(0, idx - 20));
  }, []);

  const handleLoadEarlier = () => {
    const el = messagesContainerRef.current;
    if (el) {
      pendingScrollAdjustRef.current = {
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
      };
    }
    setWindowStart((w) => Math.max(0, w - CHAT_WINDOW_SIZE));
  };

  // After growing the window upward, restore the scroll position so the view
  // does not jump. Native scroll anchoring is disabled on the list, so this
  // manual adjustment is the single source of truth.
  useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) {
      return;
    }
    const adjust = pendingScrollAdjustRef.current;
    if (adjust) {
      el.scrollTop = adjust.scrollTop + (el.scrollHeight - adjust.scrollHeight);
      pendingScrollAdjustRef.current = null;
      return;
    }
    const jumpId = pendingJumpRef.current;
    if (jumpId) {
      pendingJumpRef.current = null;
      const target = document.getElementById(`chat-msg-${jumpId}`);
      if (target) {
        scrollAndHighlight(target);
      }
    }
  }, [windowStart]);

  const renderedMessages = chatMessages.slice(windowStart);

  return (
    <div className="relative h-full">
      <ul
        className="relative h-full overflow-auto scrollBar messages-item-wrap px-3 3xl:px-5 list-none"
        style={{ overflowAnchor: 'none' }}
        ref={messagesContainerRef}
        onScroll={handleScroll}
        tabIndex={0}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {windowStart > 0 && (
          <li className="flex justify-center py-2">
            <button
              type="button"
              onClick={handleLoadEarlier}
              className="flex items-center gap-1.5 rounded-full bg-[#00A1F2] text-white shadow-lg px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-[#08C] focus-ring"
            >
              {t('right-panel.load-earlier-messages')}
            </button>
          </li>
        )}
        {renderedMessages.map((message) => (
          <Fragment key={message.id}>
            {dividerId === message.id && (
              <li aria-hidden="true" className="flex items-center gap-2 py-1">
                <span className="flex-1 border-t border-[#00A1F2]/50" />
                <span className="text-[11px] font-medium text-[#00A1F2]">
                  {t('right-panel.new-messages')}
                </span>
                <span className="flex-1 border-t border-[#00A1F2]/50" />
              </li>
            )}
            <li
              id={`chat-msg-${message.id}`}
              className="message-item py-2 transition-shadow"
            >
              <Message
                body={message}
                chatKey={messageKey}
                currentUser={currentUser}
                onJumpQuote={handleJumpToMessage}
              />
            </li>
          </Fragment>
        ))}
      </ul>
      {!isAtBottom && (
        <button
          type="button"
          aria-label={t('right-panel.scroll-to-bottom').toString()}
          title={t('right-panel.scroll-to-bottom').toString()}
          onClick={forceScrollToBottom}
          className="absolute bottom-3 start-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-[#00A1F2] text-white shadow-lg px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-[#08C] focus-ring"
        >
          <ScrollToBottomIconSVG />
          {unreadCount > 0 && (
            <span className="min-w-5 h-5 px-1 rounded-full bg-white text-[#00A1F2] text-[11px] font-semibold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default Messages;
