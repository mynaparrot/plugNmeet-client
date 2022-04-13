import React, { useEffect, useState } from 'react';
import { Room } from 'livekit-client';

import Messages from './messages';
import TextBoxArea from './text-box';
import { RootState, store, useAppSelector } from '../../store';
import { createSelector } from '@reduxjs/toolkit';

interface IRightPanelProps {
  currentRoom: Room;
  isRecorder: boolean;
}

const isChatLockSelector = createSelector(
  (state: RootState) =>
    state.session.currenUser?.metadata?.lock_settings.lock_chat,
  (lock_chat) => lock_chat,
);

const RightPanel = ({ currentRoom, isRecorder }: IRightPanelProps) => {
  const isChatLock = useAppSelector(isChatLockSelector);
  const [show, setShow] = useState<boolean>(false);

  // default room lock settings
  useEffect(() => {
    const isLock =
      store.getState().session.currentRoom.metadata?.default_lock_settings
        ?.lock_chat;
    const isAdmin = store.getState().session.currenUser?.metadata?.is_admin;

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
    <div id="main-right-panel" className="h-[calc(100%)]">
      <div className="h-[calc(100%)] messageModule-wrapper scrollBar relative z-10 right-0 top-0 w-[230px] xl:w-[300px] px-2 xl:px-4 pt-2 xl:pt-4 overflow-auto multi-gradient">
        <div className="all-MessageModule-wrap">
          <Messages />
        </div>
      </div>
      {isRecorder ? (
        <div className="w-[100%] h-[2px] hiddenAnimation absolute z-50 bottom-0 bg-gradient-to-r from-primaryColor to-secondaryColor" />
      ) : null}
      {show ? (
        <div className="message-form fixed z-[99] xl:z-0 bottom-1 w-[230px] xl:w-[300px] bg-white">
          <TextBoxArea currentRoom={currentRoom} />
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(RightPanel);
