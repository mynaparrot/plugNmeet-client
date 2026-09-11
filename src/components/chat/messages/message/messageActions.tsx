import React, { useCallback, useEffect, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import copy from 'copy-text-to-clipboard';

import Modal from '../../../../helpers/ui/modal';
import { useAppDispatch } from '../../../../store';
import {
  setEditDraft,
  setReplyDraft,
} from '../../../../store/slices/chatMessagesSlice';
import { getNatsConn } from '../../../../helpers/nats';
import {
  canDeleteMessage,
  canEditMessage,
  canReplyMessage,
  getPlainTextSnippet,
} from '../../utils';
import { IMessageActionsProps } from './types';
import { ChatReplyIconSVG } from '../../../../assets/Icons/ChatReplyIconSVG';
import { ChatEditIconSVG } from '../../../../assets/Icons/ChatEditIconSVG';
import { ChatDeleteIconSVG } from '../../../../assets/Icons/ChatDeleteIconSVG';
import { ChatCopyIconSVG } from '../../../../assets/Icons/ChatCopyIconSVG';
import { FooterMenuIconSVG } from '../../../../assets/Icons/FooterMenuIconSVG';

const MessageActions = ({
  body,
  chatKey,
  currentUserId,
  isAdmin,
  onEditStart,
}: IMessageActionsProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDeleted = !!body.meta?.isDeleted;
  const isSystem = body.fromUserId === 'system';

  useEffect(() => {
    if (isDeleted) {
      setConfirmDelete(false);
    }
  }, [isDeleted]);

  const doReply = useCallback(() => {
    dispatch(setReplyDraft({ id: body.id, key: chatKey }));
  }, [dispatch, body.id, chatKey]);

  const doEdit = useCallback(() => {
    dispatch(setEditDraft({ id: body.id, key: chatKey }));
    onEditStart();
  }, [dispatch, body.id, chatKey, onEditStart]);

  const doDelete = useCallback(() => {
    setConfirmDelete(true);
  }, []);

  const confirmDeleteMsg = useCallback(() => {
    getNatsConn()?.deleteChatMessage(body, currentUserId, isAdmin);
    setConfirmDelete(false);
  }, [body, currentUserId, isAdmin]);

  const doCopy = useCallback(() => {
    const text = getPlainTextSnippet(body.message, 2000);
    if (!text) {
      return;
    }
    copy(text);
  }, [body.message]);

  if (isSystem || isDeleted) {
    return null;
  }

  const showReply = canReplyMessage(body);
  const showEdit = canEditMessage(body, currentUserId);
  const showDelete = canDeleteMessage(body, currentUserId, isAdmin);
  const showCopy = !isDeleted && getPlainTextSnippet(body.message, 1) !== '';

  if (!showReply && !showEdit && !showDelete && !showCopy) {
    return null;
  }

  const menuItemClass =
    'w-full flex items-center gap-2 px-2 3xl:px-3 h-8 cursor-pointer text-sm font-medium text-Gray-950 dark:text-white rounded-lg hover:bg-Gray-50 dark:hover:bg-dark-secondary2 transition-all duration-200';

  // Single inline ••• in the header row (all devices). Menu opens below it,
  // so it never overlays the timestamp or message body. HeadlessUI Menu owns
  // open state internally: item click, Escape, or outside click closes it.
  return (
    <>
      <Menu as="div" className="relative shrink-0">
        <MenuButton
          aria-label={t('right-panel.message-options').toString()}
          data-chat-menu-btn="true"
          className="flex h-6 w-6 items-center justify-center rounded-full text-Gray-500 dark:text-dark-text hover:bg-Gray-100 dark:hover:bg-Gray-700 cursor-pointer focus-ring"
        >
          <FooterMenuIconSVG />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          transition
          className="z-20 w-44 rounded-xl border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary shadow-lg p-1.5 focus:outline-hidden transition ease-out data-closed:opacity-0 data-closed:scale-95 data-enter:duration-100 data-leave:duration-75"
        >
          {showReply && (
            <MenuItem>
              <button type="button" className={menuItemClass} onClick={doReply}>
                <ChatReplyIconSVG />
                {t('right-panel.reply')}
              </button>
            </MenuItem>
          )}
          {showEdit && (
            <MenuItem>
              <button type="button" className={menuItemClass} onClick={doEdit}>
                <ChatEditIconSVG />
                {t('right-panel.edit-message')}
              </button>
            </MenuItem>
          )}
          {showCopy && (
            <MenuItem>
              <button type="button" className={menuItemClass} onClick={doCopy}>
                <ChatCopyIconSVG />
                {t('right-panel.copy-message')}
              </button>
            </MenuItem>
          )}
          {showDelete && (
            <MenuItem>
              <button
                type="button"
                className={`${menuItemClass} text-Red-700 hover:bg-Red-600 hover:text-white`}
                onClick={doDelete}
              >
                <ChatDeleteIconSVG />
                {t('right-panel.delete-message')}
              </button>
            </MenuItem>
          )}
        </MenuItems>
      </Menu>

      <Modal
        show={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('right-panel.delete-confirm-title')}
        maxWidth="max-w-xs"
        renderButtons={() => (
          <>
            <button
              type="button"
              className="h-10 px-5 w-32 flex items-center justify-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow cursor-pointer"
              onClick={confirmDeleteMsg}
            >
              {t('right-panel.delete-message')}
            </button>
            <button
              type="button"
              className="primary-button h-10 px-5 w-32 flex items-center justify-center text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow cursor-pointer ms-4"
              onClick={() => setConfirmDelete(false)}
            >
              {t('cancel')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-Gray-900 dark:text-white">
          {t('right-panel.delete-confirm-body')}
        </p>
      </Modal>
    </>
  );
};

export default MessageActions;
