import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from 'plugnmeet-protocol-js';

import { useAppSelector } from '../../../../store';
import { getNatsConn } from '../../../../helpers/nats';
import { WELCOME_MESSAGE_ID } from '../../../../store/slices/chatMessagesSlice';
import { TrashIconSVG } from '../../../../assets/Icons/TrashIconSVG';

// Auto-dismiss the inline confirmation if the moderator doesn't decide.
const CONFIRM_TIMEOUT_MS = 5000;

const DeleteMsgBtn = ({ body }: { body: ChatMessage }) => {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const isAdmin = useAppSelector(
    (state) => !!state.session.currentUser?.metadata?.isAdmin,
  );

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  if (
    !isAdmin ||
    body.isPrivate ||
    body.fromUserId === 'system' ||
    body.id === WELCOME_MESSAGE_ID
  ) {
    return null;
  }

  const askConfirm = () => {
    setShowConfirm(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => setShowConfirm(false),
      CONFIRM_TIMEOUT_MS,
    );
  };

  const cancel = () => {
    clearTimeout(timeoutRef.current);
    setShowConfirm(false);
  };

  const deleteMsg = () => {
    clearTimeout(timeoutRef.current);
    setShowConfirm(false);
    getNatsConn()
      .deletePublicChatMsg(body.id)
      .catch((e) => console.error(e));
  };

  if (showConfirm) {
    return (
      <span className="flex items-center gap-1 text-xs whitespace-nowrap">
        <button
          type="button"
          onClick={deleteMsg}
          className="px-1.5 py-0.5 rounded font-medium text-white bg-Red-600 hover:bg-Red-400 cursor-pointer"
        >
          {t('right-panel.delete-msg')}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="px-1.5 py-0.5 rounded text-Gray-700 dark:text-dark-text hover:bg-Gray-100 dark:hover:bg-Gray-800 cursor-pointer"
        >
          {t('cancel')}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={askConfirm}
      title={t('right-panel.delete-msg')}
      aria-label={t('right-panel.delete-msg')}
      className="shrink-0 text-Gray-500 hover:text-Red-600 dark:text-dark-text dark:hover:text-Red-400 cursor-pointer"
    >
      <TrashIconSVG />
    </button>
  );
};

export default DeleteMsgBtn;
