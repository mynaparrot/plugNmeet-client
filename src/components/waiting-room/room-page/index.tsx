import React from 'react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';

import { RootState, useAppSelector } from '../../../store';
import Logo from './logo';

const waitingRoomMessageSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.waiting_room_features,
  (waiting_room_features) => waiting_room_features?.waiting_room_msg,
);

const WaitingRoomPage = () => {
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';
  const { t } = useTranslation();
  const waitingRoomMessage = useAppSelector(waitingRoomMessageSelector);

  return (
    <>
      <div
        className="waiting-room relative flex items-center justify-center w-full h-screen"
        style={{
          backgroundImage: `url("${assetPath}/imgs/app-banner.jpg")`,
        }}
      >
        <div className="waiting-room-inner relative z-10">
          <div className="logo w-full m-auto relative z-20">
            <Logo />
          </div>
          <div className="divider my-5 h-[2px] w-full max-w-[50px] bg-primaryColor dark:bg-darkText m-auto"></div>
          <div className="loading-wrap relative h-24">
            <div className="loading absolute text-center top-3 z-[999] left-0 right-0 m-auto">
              <div className="lds-ripple">
                <div className="border-secondaryColor" />
                <div className="border-secondaryColor" />
              </div>
            </div>
          </div>
          <p className="text-3xl dark:text-darkText w-full max-w-5xl m-auto text-center leading-normal">
            {isEmpty(waitingRoomMessage)
              ? t('notifications.waiting-for-approval')
              : waitingRoomMessage}
          </p>
        </div>
      </div>
    </>
  );
};

export default WaitingRoomPage;
