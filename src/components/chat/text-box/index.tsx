import React, {
  ClipboardEvent,
  KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import sanitizeHtml from 'sanitize-html';
import { useTranslation } from 'react-i18next';
import { isEmpty } from 'es-toolkit/compat';
import { RoomUploadedFileType } from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import FileSend from './fileSend';
import { getNatsConn } from '../../../helpers/nats';
import { useAutosizeTextArea } from './useAutosizeTextArea';
import { publishFileAttachmentToChat } from '../utils';
import { uploadResumableFile } from '../../../helpers/fileUpload';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';

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

  const [message, setMessage] = useState<string>('');
  useAutosizeTextArea(textAreaRef.current, message);

  const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = evt.target?.value;

    setMessage(val);
  };

  const showSendFile = useMemo(
    () => !!chatFeatures?.allowFileUpload,
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

  const cleanHtml = (rawText: string) => {
    return sanitizeHtml(rawText, {
      allowedTags: ['b', 'i', 'strong', 'br'],
      allowedSchemes: ['mailto', 'tel'],
    });
  };

  const sendMsg = useCallback(async () => {
    if (conn) {
      const msg = cleanHtml(message);
      if (isEmpty(msg)) {
        return;
      }

      await conn.sendChatMsg(
        selectedChatOption,
        msg.replace(/\r?\n/g, '<br />'),
      );
      setMessage('');
    }
  }, [conn, message, selectedChatOption]);

  const onEnterPress = useCallback(
    async (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        await sendMsg();
      }
    },
    [sendMsg],
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

  return (
    <div className="flex items-center justify-between border border-Gray-200 rounded-2xl 3xl:rounded-3xl p-1.5 w-full">
      {showSendFile && (
        <FileSend
          lockSendFile={isFileSendingLocked}
          chatFeatures={chatFeatures}
        />
      )}
      <textarea
        name="message-textarea"
        id="message-textarea"
        className="flex-1 outline-hidden text-xs 3xl:text-sm text-Gray-600 font-normal h-10 mr-2 overflow-hidden"
        value={message}
        onChange={handleChange}
        disabled={isMsgSendingLocked}
        placeholder={t('right-panel.chat-box-placeholder').toString()}
        onKeyDown={onEnterPress}
        ref={textAreaRef}
        rows={1}
        onPaste={handleOnPaste}
      />
      <button
        disabled={isMsgSendingLocked}
        onClick={sendMsg}
        className={`w-7 3xl:w-9 h-7 3xl:h-9 flex items-center justify-center rounded-full transition-all duration-300 hover:bg-[#00A1F2] hover:border-[#08C] ${isEmpty(message) ? 'bg-[#00A1F2]/30 border border-[#08C]/30' : 'bg-[#00A1F2] border border-[#08C]'}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
        >
          <path
            d="M9 15V3M9 3L4.5 7.5M9 3L13.5 7.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};

export default TextBoxArea;
