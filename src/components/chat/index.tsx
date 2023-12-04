import React, { useEffect, useState } from 'react';
import { Room } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

import { RootState, store, useAppSelector } from '../../store';
import TextBoxArea from './text-box';
import ChatTabs from './chatTabs';

interface IChatComponentProps {
  currentRoom: Room;
  isRecorder: boolean;
}

const isChatLockSelector = createSelector(
  (state: RootState) => state.session.currentUser?.metadata?.lock_settings,
  (lock_settings) => lock_settings?.lock_chat,
);
const themeSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.theme,
);

const ChatComponent = ({ currentRoom, isRecorder }: IChatComponentProps) => {
  const isChatLock = useAppSelector(isChatLockSelector);
  const theme = useAppSelector(themeSelector);
  const [show, setShow] = useState<boolean>(false);
  const [chosenEmoji, setChosenEmoji] = useState<string | null>(null);
  const [isOpenEmojiPanel, setIsOpenEmojiPanel] = useState(false);

  // default room lock settings
  useEffect(() => {
    const isLock =
      store.getState().session.currentRoom.metadata?.default_lock_settings
        ?.lock_chat;
    const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;

    if (isLock && !isAdmin) {
      if (isChatLock !== false) {
        setShow(false);
      }
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (isRecorder) {
      setShow(false);
    }
  }, [isRecorder]);

  useEffect(() => {
    if (isRecorder) {
      return;
    }

    if (isChatLock) {
      setShow(false);
    } else {
      setShow(true);
    }
  }, [isChatLock, isRecorder]);

  const onEmojiClick = (data: EmojiClickData) => {
    setChosenEmoji(`${data.emoji}`);
  };

  const onAfterSendMessage = () => {
    if (isOpenEmojiPanel) {
      setIsOpenEmojiPanel(false);
    }
  };

  return (
    <>
      <div className="h-[calc(100%)] messageModule-wrapper relative z-10 right-0 top-0 w-[250px] xl:w-[320px] multi-gradient">
        <div className="all-MessageModule-wrap h-full">
          <ChatTabs />
        </div>
      </div>
      {isRecorder ? (
        <div className="w-[100%] h-[1px] hiddenAnimation absolute z-50 bottom-0 bg-gradient-to-r from-primaryColor to-secondaryColor" />
      ) : null}
      {show ? (
        <>
          <div
            className={`emoji-selection-wrap w-[250px] xl:w-[300px] fixed z-[99] bottom-[120px] lg:bottom-[65px] right-0 left-10 md:left-auto transition ease-in ${
              isOpenEmojiPanel
                ? 'emoji-active opacity-100 visible pointer-events-auto'
                : 'opacity-0 invisible pointer-events-none'
            }`}
          >
            {isOpenEmojiPanel ? (
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                lazyLoadEmojis={true}
                theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
              />
            ) : null}
          </div>
          <div className="message-form fixed z-[99] xl:z-0 bottom-1 w-[250px] xl:w-[320px] bg-white">
            <TextBoxArea
              currentRoom={currentRoom}
              chosenEmoji={chosenEmoji}
              onAfterSendMessage={onAfterSendMessage}
            />
            <div
              className={`emoji-picker absolute left-2 md:-left-6 bottom-5 w-5 h-5 cursor-pointer text-secondaryColor dark:text-darkText ${
                isOpenEmojiPanel ? 'emoji-active' : ''
              }`}
              onClick={() => setIsOpenEmojiPanel(!isOpenEmojiPanel)}
            >
              {isOpenEmojiPanel ? (
                <i className="pnm-cross" />
              ) : (
                <i className="pnm-emoji" />
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};

export default ChatComponent;
