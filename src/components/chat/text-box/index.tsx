import React, { useCallback, useEffect, useState } from 'react';
import sanitizeHtml from 'sanitize-html';
import { isEmpty } from 'validator';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../../store';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import FileSend from './fileSend';
import { getNatsConn } from '../../../helpers/nats';

interface ITextBoxAreaProps {
  chosenEmoji: string | null;
  onAfterSendMessage(): void;
}

const TextBoxArea = ({
  chosenEmoji,
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

  const [lockSendMsg, setLockSendMsg] = useState<boolean>(false);
  const [lockSendFile, setLockSendFile] = useState<boolean>(false);
  const [showSendFile, setShowSendFile] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');

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

  const addEmoji = useCallback(
    (emoji: string) => {
      const msg = message + emoji;
      setMessage(msg);
    },
    [message],
  );

  useEffect(() => {
    if (chosenEmoji) {
      addEmoji(chosenEmoji);
    }
    //eslint-disable-next-line
  }, [chosenEmoji]);

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

  return (
    <>
      <div className="flex items-start justify-between h-[4.5rem] p-2 pl-10 md:pl-0">
        <textarea
          name="message-textarea"
          id="message-textarea"
          className="w-full bg-white dark:bg-darkSecondary2 h-14 max-h-14 mt-1 leading-[1.2] rounded-xl py-2 px-4 outline-none text-xs lg:text-sm primaryColor dark:text-white placeholder:text-primaryColor/70 dark:placeholder:text-white/70"
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          disabled={lockSendMsg}
          placeholder={t('right-panel.chat-box-placeholder').toString()}
          onKeyDown={(e) => onEnterPress(e)}
        />
        <div className="btns">
          <button
            disabled={lockSendMsg}
            onClick={() => sendMsg()}
            className="w-4 h-6 p-2"
          >
            <i className="pnm-send primaryColor text-[20px] dark:text-secondaryColor" />
          </button>

          {showSendFile ? <FileSend lockSendFile={lockSendFile} /> : null}
        </div>
      </div>
    </>
  );
};

export default TextBoxArea;
