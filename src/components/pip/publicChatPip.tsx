import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../store';
import { selectPublicChatMessages } from '../../store/slices/chatMessagesSlice';
import { selectRaisedHandsQueue } from '../../store/slices/participantSlice';
import { cleanHtmlForChat } from '../../helpers/utils';
import { getNatsConn } from '../../helpers/nats';
import { renderMarkdown } from '../insights-ai/ai-text-chat/helpers/renderMarkdown';
import { canSendPublicChatMessage } from './chatPermissions';
import { usePip } from './pipProvider';
import { getPipStatusItems } from './pipStatus';
import PipStatusIndicators from './pipStatusIndicators';
import PipModeSwitcher from './pipModeSwitcher';

/** Number of most recent public messages rendered in the PiP window. */
const MAX_PIP_MESSAGES = 30;

/** Distance from the bottom (px) that still counts as reading the latest message. */
const BOTTOM_THRESHOLD = 24;

/**
 * Public chat inside the shared PiP window. It lives outside of the chat side
 * panel so the window survives the panel being closed, and it never touches the
 * unread counters or the selected tab of the panel. It is also always mounted,
 * so it renders the mode switcher for both PiP views.
 */
const PublicChatPip = () => {
  const { t } = useTranslation();
  const { pipWindow, content } = usePip();

  const messages = useAppSelector(selectPublicChatMessages);

  // Unread chat is deliberately left out: the reader is already looking at chat.
  const raisedHands = useAppSelector((state) => selectRaisedHandsQueue(state).count);
  const unreadNotifications = useAppSelector(
    (state) => state.roomSettings.unreadNotificationsCount,
  );

  const statusItems = useMemo(
    () => getPipStatusItems({ raisedHands, notifications: unreadNotifications }),
    [raisedHands, unreadNotifications],
  );

  // Values that are static for the room lifetime, read once on mount.
  const { isRecorder, isAdmin, defaultLockSettings } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      isRecorder: !!currentUser?.isRecorder,
      isAdmin: !!currentUser?.metadata?.isAdmin,
      defaultLockSettings: session.currentRoom.metadata?.defaultLockSettings,
    };
  }, []);

  // Lock overrides can be changed by an admin while the window is open.
  const lockChat = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockChat,
  );
  const lockChatSendMessage = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockChatSendMessage,
  );

  const canSend = useMemo(
    () =>
      canSendPublicChatMessage({
        isRecorder,
        isAdmin,
        lockChat,
        lockChatSendMessage,
        defaultLockSettings,
      }),
    [isRecorder, isAdmin, lockChat, lockChatSendMessage, defaultLockSettings],
  );

  // Store order is oldest first, so the bounded tail is already chronological.
  const recentMessages = useMemo(
    () => messages.filter((message) => !message.meta?.isDeleted).slice(-MAX_PIP_MESSAGES),
    [messages],
  );

  const listRef = useRef<HTMLUListElement | null>(null);
  const isAtBottomRef = useRef(true);
  const lastMessageId = recentMessages[recentMessages.length - 1]?.id;

  const attachList = useCallback((list: HTMLUListElement | null) => {
    listRef.current = list;
    if (!list) return;

    // A newly mounted list (first display or reopened window) starts at the
    // newest message.
    isAtBottomRef.current = true;
    list.scrollTop = list.scrollHeight;
  }, []);

  // Follow new messages, but never fight a reader who scrolled up.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !lastMessageId || !isAtBottomRef.current) return;

    list.scrollTop = list.scrollHeight;
  }, [lastMessageId]);

  const handleScroll = (event: React.UIEvent<HTMLUListElement>) => {
    const list = event.currentTarget;
    isAtBottomRef.current =
      list.scrollHeight - list.scrollTop - list.clientHeight <= BOTTOM_THRESHOLD;
  };

  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isSendingRef = useRef(false);
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(async () => {
    // Locks can change while the box is open, so the check is repeated here.
    if (!canSend || isSendingRef.current) return;

    const input = inputRef.current;
    const submittedValue = input?.value ?? '';
    const raw = submittedValue.trim();
    if (!raw) return;

    const conn = getNatsConn();
    if (!conn) return;

    const html = renderMarkdown(raw);
    if (!html) return;

    isSendingRef.current = true;
    setIsSending(true);
    try {
      // Always 'public': a private tab selected in the panel must not reroute
      // the PiP composer.
      await conn.sendChatMsg('public', html);
      // Do not drop text typed while the send was in flight: clear the box only
      // when it still holds exactly what was submitted.
      if (input && input.value === submittedValue) input.value = '';
    } catch (error) {
      // Keep the text so the user can retry.
      console.error(error);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [canSend]);

  // The composer lives in the PiP document, so its native submit (Enter key or
  // button click) is wired up directly on the form element.
  useEffect(() => {
    if (!pipWindow || content !== 'chat' || !canSend) return;

    const form = formRef.current;
    if (!form) return;

    const onSubmit = (event: Event) => {
      event.preventDefault();
      void sendMessage();
    };

    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, [pipWindow, content, canSend, sendMessage]);

  if (!pipWindow || !content) {
    return null;
  }

  // The switcher is owned here because this component stays mounted while the
  // webcam strip (and its PiP view) can disappear, and switching back to chat
  // must not depend on that lifecycle.
  if (content === 'webcam') {
    return createPortal(<PipModeSwitcher />, pipWindow.document.body);
  }

  return createPortal(
    <div className="pip-chat-container">
      <PipModeSwitcher />
      <PipStatusIndicators items={statusItems} />
      <ul
        ref={attachList}
        className="pip-chat-list"
        role="log"
        aria-live="polite"
        aria-label={t('left-panel.public-chat').toString()}
        onScroll={handleScroll}
      >
        {recentMessages.length === 0 ? (
          <li className="pip-chat-empty">{t('right-panel.no-chat-messages').toString()}</li>
        ) : (
          recentMessages.map((message) => {
            const name = message.fromName?.trim() || t('other').toString();

            return (
              <li className="pip-chat-item" key={message.id}>
                <p className="pip-chat-name" dir="auto">
                  {name}
                </p>
                <div
                  className="pip-chat-body"
                  dir="auto"
                  dangerouslySetInnerHTML={{ __html: cleanHtmlForChat(message.message) }}
                />
              </li>
            );
          })
        )}
      </ul>
      {canSend && (
        <form ref={formRef} className="pip-chat-form">
          <input
            ref={inputRef}
            className="pip-chat-input"
            type="text"
            name="pip-chat-message"
            dir="auto"
            autoComplete="off"
            enterKeyHint="send"
            placeholder={t('right-panel.message-placeholder').toString()}
            aria-label={t('right-panel.message-placeholder').toString()}
          />
          <button className="pip-chat-send" type="submit" disabled={isSending}>
            {t('right-panel.send').toString()}
          </button>
        </form>
      )}
    </div>,
    pipWindow.document.body,
  );
};

export default PublicChatPip;
