import React, { useEffect, useState } from 'react';
import { Room } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, store, useAppSelector } from '../../store';
import TextBoxArea from './text-box';
import ChatTabs from './chatTabs';

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

  return (
    <>
      <div className="h-[calc(100%)] messageModule-wrapper relative z-10 right-0 top-0 w-[260px] xl:w-[330px] multi-gradient pl-[30px]">
        <div className="all-MessageModule-wrap h-full">
          <ChatTabs />
        </div>
      </div>
      {isRecorder ? (
        <div className="w-[100%] h-[1px] hiddenAnimation absolute z-50 bottom-0 bg-gradient-to-r from-primaryColor to-secondaryColor" />
      ) : null}
      {show ? (
        <div className="message-form fixed z-[99] xl:z-0 bottom-1 w-[230px] xl:w-[300px] bg-white">
          <TextBoxArea currentRoom={currentRoom} />
        </div>
      ) : null}
    </>
  );
};

export default ChatComponent;
