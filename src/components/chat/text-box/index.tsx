import React, {
  ClipboardEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { isEmpty } from 'es-toolkit/compat';
import { RoomUploadedFileType } from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import FileSend from './fileSend';
import { getNatsConn } from '../../../helpers/nats';
import { useAutosizeTextArea } from './useAutosizeTextArea';
import {
  getPlainTextSnippet,
  htmlToEditableText,
  publishFileAttachmentToChat,
} from '../utils';
import { renderMarkdown } from '../../insights-ai/ai-text-chat/helpers/renderMarkdown';
import { uploadResumableFile } from '../../../helpers/fileUpload';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import {
  clearChatDrafts,
  clearEditDraft,
  clearReplyDraft,
  selectEditDraftWithTarget,
  selectReplyDraftWithTarget,
} from '../../../store/slices/chatMessagesSlice';
import SendIconSVG from '../../../assets/Icons/SendIconSVG';
import { CloseIconSVG } from '../../../assets/Icons/CloseIconSVG';

const TextBoxArea = () => {
  const dispatch = useAppDispatch();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();
  const conn = getNatsConn();
  // Values that are static for the session
  const { isAdmin, chatFeatures } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      isAdmin: !!currentUser?.metadata?.isAdmin,
      chatFeatures: session.currentRoom.metadata?.roomFeatures?.chatFeatures,
    };
  }, []);

  const isLockChatSendMsg = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockChatSendMessage,
  );
  const isLockSendFile = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockChatFileShare,
  );
  const selectedChatOption = useAppSelector(
    (state) => state.roomSettings.selectedChatOption,
  );
  const defaultLockSettings = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings,
  );
  const { draft: replyDraft, target: replyTarget } = useAppSelector(
    selectReplyDraftWithTarget,
  );
  const { draft: editDraft, target: editTarget } = useAppSelector(
    selectEditDraftWithTarget,
  );

  const [message, setMessage] = useState<string>('');
  useAutosizeTextArea(textAreaRef.current, message);
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Prefill editor when entering edit mode; clear when leaving it.
  useEffect(() => {
    if (editTarget) {
      setMessage(htmlToEditableText(editTarget.message));
      textAreaRef.current?.focus();
    } else if (editDraft) {
      // target vanished (e.g. deleted) — leave edit mode
      dispatch(clearEditDraft());
      setMessage('');
    }
    // oxlint-disable-next-line exhaustive-deps
  }, [editTarget?.id, editDraft?.id]);

  useEffect(() => {
    if (replyDraft && !replyTarget) {
      dispatch(clearReplyDraft());
    }
  }, [replyDraft, replyTarget, dispatch]);

  const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = evt.target?.value;

    setMessage(val);
  };

  const showSendFile = useMemo(
    () => !!chatFeatures?.isAllowFileUpload,
    [chatFeatures],
  );

  const isMsgSendingLocked = useMemo(() => {
    if (isAdmin) return false;

    // User-specific setting takes precedence.
    if (typeof isLockChatSendMsg !== 'undefined') {
      return isLockChatSendMsg;
    }
    // Otherwise, fall back to the room's default setting.
    return !!defaultLockSettings?.lockChatSendMessage;
  }, [isAdmin, isLockChatSendMsg, defaultLockSettings?.lockChatSendMessage]);

  const isFileSendingLocked = useMemo(() => {
    if (isAdmin) return false;

    // User-specific setting takes precedence.
    if (typeof isLockSendFile !== 'undefined') {
      return isLockSendFile;
    }
    // Otherwise, fall back to the room's default setting.
    return !!defaultLockSettings?.lockChatFileShare;
  }, [isAdmin, isLockSendFile, defaultLockSettings?.lockChatFileShare]);

  const formatMessageHtml = useCallback((raw: string) => {
    const msg = renderMarkdown(raw);
    if (isEmpty(msg)) {
      return '';
    }
    return msg;
  }, []);

  const sendMsg = useCallback(async () => {
    if (isSendingMsg || isMsgSendingLocked) {
      return;
    }
    if (conn) {
      // Edit mode: update existing message instead of sending new one.
      if (editDraft && editTarget) {
        const html = formatMessageHtml(message);
        if (isEmpty(html)) {
          return;
        }
        setIsSendingMsg(true);
        try {
          await conn.editChatMessage(editTarget, html);
          dispatch(clearEditDraft());
          setMessage('');
        } catch (e) {
          console.error(e);
        } finally {
          setIsSendingMsg(false);
          textAreaRef.current?.focus();
        }
        return;
      }

      const html = formatMessageHtml(message);
      if (isEmpty(html)) {
        return;
      }
      setIsSendingMsg(true);
      setMessage('');

      try {
        if (replyDraft && replyTarget) {
          await conn.sendChatMsg(selectedChatOption, html, {
            replyToId: replyTarget.id,
            replyToName: replyTarget.fromName,
            replyToText: getPlainTextSnippet(replyTarget.message),
            isDeleted: false,
          });
          dispatch(clearReplyDraft());
        } else {
          await conn.sendChatMsg(selectedChatOption, html);
        }
      } catch (e) {
        console.error(e);
        setMessage(message);
      } finally {
        setIsSendingMsg(false);
        textAreaRef.current?.focus();
      }
    }
  }, [
    conn,
    message,
    selectedChatOption,
    isSendingMsg,
    isMsgSendingLocked,
    editDraft,
    editTarget,
    replyDraft,
    replyTarget,
    formatMessageHtml,
    dispatch,
  ]);

  const cancelDrafts = useCallback(() => {
    dispatch(clearChatDrafts());
    setMessage('');
  }, [dispatch]);

  const onEnterPress = useCallback(
    async (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        await sendMsg();
      } else if (e.key === 'Escape' && (editDraft || replyDraft)) {
        e.preventDefault();
        cancelDrafts();
      }
    },
    [sendMsg, editDraft, replyDraft, cancelDrafts],
  );

  const handleOnPaste = useCallback(
    (e: ClipboardEvent) => {
      if (isFileSendingLocked || isMsgSendingLocked) {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        const files: File[] = [];
        const items = e.clipboardData.items;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const f = items[i].getAsFile();
            if (f) {
              const extension = f.name.slice(
                ((f.name.lastIndexOf('.') - 1) >>> 0) + 2,
              );
              files.push(
                new File([f], Date.now().toString() + '.' + extension, {
                  type: f.type,
                  lastModified: f.lastModified,
                }),
              );
            }
          }
        }

        if (files.length) {
          uploadResumableFile(
            chatFeatures?.allowedFileTypes ?? [],
            chatFeatures?.maxFileSize,
            RoomUploadedFileType.CHAT_FILE,
            files,
            (result) => {
              publishFileAttachmentToChat(
                result.filePath,
                result.fileName,
              ).then(() =>
                dispatch(
                  addUserNotification({
                    message: t('right-panel.file-upload-success'),
                    typeOption: 'success',
                  }),
                ),
              );
            },
          );
        }
      }
    },
    [isFileSendingLocked, isMsgSendingLocked, chatFeatures, dispatch, t],
  );

  const placeholderText = isSendingMsg
    ? t('right-panel.sending-message')
    : editDraft
      ? t('right-panel.edit-message')
      : t('right-panel.chat-box-placeholder');

  const showReplyBar = replyDraft && replyTarget && !editDraft;
  const showEditBar = editDraft && editTarget;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {showReplyBar && replyTarget && (
        <div className="flex items-center gap-2 rounded-xl border border-Gray-200 dark:border-Gray-700 bg-Gray-50 dark:bg-Gray-800 px-2.5 py-1.5">
          <div className="flex-1 min-w-0 border-s-2 border-[#00A1F2] ps-2">
            <p className="text-[11px] font-semibold text-[#00A1F2] truncate">
              {t('right-panel.replying-to', { name: replyTarget.fromName })}
            </p>
            <p className="text-xs text-Gray-600 dark:text-dark-text truncate">
              {getPlainTextSnippet(replyTarget.message)}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('cancel').toString()}
            className="text-Gray-600 dark:text-dark-text cursor-pointer focus-ring shrink-0"
            onClick={() => dispatch(clearReplyDraft())}
          >
            <CloseIconSVG />
          </button>
        </div>
      )}
      {showEditBar && (
        <div className="flex items-center gap-2 rounded-xl border border-Gray-200 dark:border-Gray-700 bg-Gray-50 dark:bg-Gray-800 px-2.5 py-1.5">
          <p className="flex-1 text-xs font-medium text-Gray-700 dark:text-dark-text truncate">
            {t('right-panel.editing-message')}
          </p>
          <button
            type="button"
            aria-label={t('cancel').toString()}
            className="text-Gray-600 dark:text-dark-text cursor-pointer focus-ring shrink-0"
            onClick={cancelDrafts}
          >
            <CloseIconSVG />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between border border-Gray-200 dark:border-Gray-700 rounded-2xl 3xl:rounded-3xl p-1.5 w-full">
        {showSendFile && (
          <FileSend
            lockSendFile={isFileSendingLocked}
            chatFeatures={chatFeatures}
          />
        )}
        <textarea
          dir="auto"
          name="message-textarea"
          id="message-textarea"
          className="flex-1 outline-hidden text-xs 3xl:text-sm text-Gray-600 dark:text-white font-normal h-10 mr-2 overflow-hidden"
          value={message}
          onChange={handleChange}
          disabled={isMsgSendingLocked}
          placeholder={placeholderText}
          onKeyDown={onEnterPress}
          ref={textAreaRef}
          rows={1}
          onPaste={handleOnPaste}
        />
        <button
          disabled={isMsgSendingLocked || isSendingMsg}
          onClick={sendMsg}
          aria-label={
            showEditBar ? t('right-panel.save').toString() : undefined
          }
          title={showEditBar ? t('right-panel.save').toString() : undefined}
          className={`w-7 3xl:w-9 h-7 3xl:h-9 flex items-center justify-center rounded-full transition-all duration-300 hover:bg-[#00A1F2] hover:border-[#08C] ${isEmpty(message) ? 'bg-[#00A1F2]/30 border border-[#08C]/30' : 'bg-[#00A1F2] border border-[#08C]'} ${!isMsgSendingLocked && !isEmpty(message) ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        >
          <SendIconSVG />
        </button>
      </div>
    </div>
  );
};

export default TextBoxArea;
