import React, { useEffect, useState } from 'react';
import { Room } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, store, useAppSelector } from '../../store';
import TextBoxArea from './text-box';
import ChatTabs from './chatTabs';
import Picker from 'emoji-picker-react';

interface IChatComponentProps {
  currentRoom: Room;
  isRecorder: boolean;
}

const isChatLockSelector = createSelector(
  (state: RootState) =>
    state.session.currentUser?.metadata?.lock_settings.lock_chat,
  (lock_chat) => lock_chat,
);

const ChatComponent = ({ currentRoom, isRecorder }: IChatComponentProps) => {
  const isChatLock = useAppSelector(isChatLockSelector);
  const [show, setShow] = useState<boolean>(false);

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

  const [chosenEmoji, setChosenEmoji] = useState(null);

  const onEmojiClick = (event, emojiObject) => {
    setChosenEmoji(emojiObject);
  };
  const [emojiToggle, toggleEmojiToggle] = useState(false);

  return (
    <>
      <div className="h-[calc(100%)] messageModule-wrapper relative z-10 right-0 top-0 w-[250px] xl:w-[300px] multi-gradient">
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
              emojiToggle
                ? 'emoji-active opacity-100 visible pointer-events-auto'
                : 'opacity-0 invisible pointer-events-none'
            }`}
          >
            <Picker onEmojiClick={onEmojiClick} />
          </div>
          <div className="message-form fixed z-[99] xl:z-0 bottom-1 w-[250px] xl:w-[300px] bg-white">
            <TextBoxArea currentRoom={currentRoom} chosenEmoji={chosenEmoji} />
            <div
              className={`emoji-picker absolute left-2 md:-left-6 bottom-5 w-5 h-5 cursor-pointer text-secondaryColor dark:text-darkText ${
                emojiToggle ? 'emoji-active' : ''
              }`}
              onClick={() => toggleEmojiToggle(!emojiToggle)}
            >
              {emojiToggle ? (
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M6.22566 4.81096C5.83514 4.42044 5.20197 4.42044 4.81145 4.81096C4.42092 5.20148 4.42092 5.83465 4.81145 6.22517L10.5862 11.9999L4.81151 17.7746C4.42098 18.1651 4.42098 18.7983 4.81151 19.1888C5.20203 19.5793 5.8352 19.5793 6.22572 19.1888L12.0004 13.4141L17.7751 19.1888C18.1656 19.5793 18.7988 19.5793 19.1893 19.1888C19.5798 18.7983 19.5798 18.1651 19.1893 17.7746L13.4146 11.9999L19.1893 6.22517C19.5799 5.83465 19.5799 5.20148 19.1893 4.81096C18.7988 4.42044 18.1657 4.42044 17.7751 4.81096L12.0004 10.5857L6.22566 4.81096Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  x="0px"
                  y="0px"
                  viewBox="0 0 501.333 501.333"
                >
                  <path
                    d="M250.667,0C112,0,0,112,0,250.667s112,250.667,250.667,250.667s250.667-112,250.667-250.667S389.333,0,250.667,0z
			 M250.667,459.733c-115.2,0-209.067-93.867-209.067-209.067S135.467,41.6,250.667,41.6s209.067,93.867,209.067,209.067
			S365.867,459.733,250.667,459.733z"
                    fill="currentColor"
                  />
                  <path
                    d="M168.533,155.733c-11.733,0-21.333,9.6-21.333,21.333v5.333c0,11.733,9.6,21.333,21.333,21.333s21.333-9.6,21.333-21.333
			v-5.333C189.867,165.333,180.267,155.733,168.533,155.733z"
                    fill="currentColor"
                  />

                  <path
                    d="M332.8,155.733c-11.733,0-21.333,9.6-21.333,21.333v5.333c0,11.733,9.6,21.333,21.333,21.333s21.333-9.6,21.333-21.333
			v-5.333C354.133,165.333,344.533,155.733,332.8,155.733z"
                    fill="currentColor"
                  />
                  <path
                    d="M373.333,281.6c-8.533-8.533-21.333-8.533-29.867,0c-51.2,51.2-133.333,51.2-184.533,0
			c-8.533-8.533-21.333-8.533-29.867,0s-8.533,21.333,0,29.867c33.067,33.067,77.867,50.133,121.6,50.133s88.533-16,122.667-50.133
			C381.867,302.933,381.867,290.133,373.333,281.6z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};

export default ChatComponent;
