import React, { useEffect, useState, useRef } from 'react';
import sanitizeHtml from 'sanitize-html';
import { isEmpty } from 'validator';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../../store';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import FileSend from './fileSend';
import { getNatsConn } from '../../../helpers/nats';
import { useAutosizeTextArea } from './useAutosizeTextArea';
import { publishFileAttachmentToChat } from '../utils';
import { uploadResumableFile } from '../../../helpers/utils';

interface ITextBoxAreaProps {
  // chosenEmoji: string | null;
  onAfterSendMessage(): void;
}

const TextBoxArea = ({
  // chosenEmoji,
  onAfterSendMessage,
}: ITextBoxAreaProps) => {
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

  const { t } = useTranslation();
  const conn = getNatsConn();
  const chatFeatures =
    store.getState().session.currentRoom.metadata?.roomFeatures?.chatFeatures;

  const [lockSendMsg, setLockSendMsg] = useState<boolean>(false);
  const [lockSendFile, setLockSendFile] = useState<boolean>(false);
  const [showSendFile, setShowSendFile] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');

  // const [textareaHeight, setTextareaHeight] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useAutosizeTextArea(textAreaRef.current, message);

  const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = evt.target?.value;

    setMessage(val);
  };

  useEffect(() => {
    const metadata = store.getState().session.currentRoom
      .metadata as IRoomMetadata;

    if (!metadata.roomFeatures?.chatFeatures?.allowFileUpload) {
      setShowSendFile(false);
    }
  }, []);

  useEffect(() => {
    if (isLockChatSendMsg) {
      setLockSendMsg(true);
    } else {
      setLockSendMsg(false);
    }
    if (isLockSendFile) {
      setLockSendFile(true);
    } else {
      setLockSendFile(false);
    }
  }, [isLockChatSendMsg, isLockSendFile]);

  // default room lock settings
  useEffect(() => {
    const lock_chat_send_message =
      store.getState().session.currentRoom.metadata?.defaultLockSettings
        ?.lockChatSendMessage;
    const lock_chat_file_share =
      store.getState().session.currentRoom.metadata?.defaultLockSettings
        ?.lockChatFileShare;

    const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;

    if (lock_chat_send_message && !isAdmin) {
      if (isLockChatSendMsg) {
        setLockSendMsg(true);
      }
    }
    if (lock_chat_file_share && !isAdmin) {
      if (isLockChatSendMsg) {
        setLockSendFile(true);
      }
    }
    // eslint-disable-next-line
  }, []);

  // const addEmoji = useCallback(
  //   (emoji: string) => {
  //     const msg = message + emoji;
  //     setMessage(msg);
  //   },
  //   [message],
  // );

  // useEffect(() => {
  //   if (chosenEmoji) {
  //     addEmoji(chosenEmoji);
  //   }
  //   //eslint-disable-next-line
  // }, [chosenEmoji]);

  const cleanHtml = (rawText: string) => {
    return sanitizeHtml(rawText, {
      allowedTags: ['b', 'i', 'strong', 'br'],
      allowedSchemes: ['mailto', 'tel'],
    });
  };

  const sendMsg = async () => {
    const msg = cleanHtml(message);
    if (isEmpty(msg)) {
      return;
    }

    await conn.sendChatMsg(selectedChatOption, msg.replace(/\r?\n/g, '<br />'));
    setMessage('');

    onAfterSendMessage();
  };

  const onEnterPress = async (e: any) => {
    if (e.keyCode == 13 && e.shiftKey == false) {
      e.preventDefault();
      await sendMsg();
    }
  };

  const handleOnPaste = (e) => {
    if (isLockSendFile || isLockChatSendMsg) {
      return;
    }

    if (e.clipboardData && e.clipboardData.items) {
      const files: File[] = [];
      const items: DataTransferItemList = e.clipboardData.items;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const f = items[i].getAsFile();
          if (f) {
            files.push(
              new File([f], Date.now().toString() + '.png', {
                type: f.type,
              }),
            );
          }
        }
      }

      if (files.length) {
        uploadResumableFile(
          chatFeatures?.allowedFileTypes ?? [],
          chatFeatures?.maxFileSize,
          files,
          (result) => {
            publishFileAttachmentToChat(
              result.filePath,
              result.fileName,
            ).then();
          },
          undefined,
        );
      }
    }
  };

  const handleOnDrop = (e) => {
    e.preventDefault();
    if (isLockSendFile || isLockChatSendMsg) {
      return;
    }

    if (e.dataTransfer && e.dataTransfer.files) {
      const files: File[] = [];
      for (const f of e.dataTransfer.files) {
        files.push(f);
      }
      if (files.length > 0) {
        uploadResumableFile(
          chatFeatures?.allowedFileTypes ?? [],
          chatFeatures?.maxFileSize,
          files,
          (result: any) => {
            publishFileAttachmentToChat(
              result.filePath,
              result.fileName,
            ).then();
          },
          undefined,
        );
      }
    }
  };

  return (
    <div
      className="flex items-center justify-between border border-Gray-200 rounded-2xl 3xl:rounded-3xl p-1.5 w-full"
      onDrop={handleOnDrop}
    >
      {showSendFile ? <FileSend lockSendFile={lockSendFile} /> : null}
      <textarea
        name="message-textarea"
        id="message-textarea"
        className="flex-1 outline-none text-xs 3xl:text-sm text-Gray-600 font-normal h-full mr-2 overflow-hidden"
        value={message}
        onChange={handleChange}
        disabled={lockSendMsg}
        placeholder={t('right-panel.chat-box-placeholder').toString()}
        onKeyDown={(e) => onEnterPress(e)}
        ref={textAreaRef}
        rows={1}
        onPaste={handleOnPaste}
      />
      <button
        disabled={lockSendMsg}
        onClick={() => sendMsg()}
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
