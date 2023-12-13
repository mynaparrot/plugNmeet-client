import React, { useState, useEffect } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';

import {
  useAppSelector,
  RootState,
  useAppDispatch,
  store,
} from '../../../store';
import { updateIsActiveChatPanel } from '../../../store/slices/bottomIconsActivitySlice';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';

const isActiveChatPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.isActiveChatPanel,
);

const totalUnreadChatMsgsSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.totalUnreadChatMsgs,
);

const ChatIcon = () => {
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const { t } = useTranslation();

  const isActiveChatPanel = useAppSelector(isActiveChatPanelSelector);
  const totalUnreadChatMsgs = useAppSelector(totalUnreadChatMsgsSelector);
  const [iconCSS, setIconCSS] = useState<string>('primaryColor');
  const [allowChat, setAllowChat] = useState<boolean>(true);

  useEffect(() => {
    if (isActiveChatPanel) {
      setIconCSS('secondaryColor');
    } else {
      setIconCSS('primaryColor dark:text-darkText');
    }
  }, [isActiveChatPanel]);

  useEffect(() => {
    const metadata = store.getState().session.currentRoom
      .metadata as IRoomMetadata;
    if (!metadata.room_features?.chat_features.allow_chat) {
      setAllowChat(false);
      dispatch(updateIsActiveChatPanel(false));
    }
  }, [dispatch]);

  const toggleChatPanel = () => {
    dispatch(updateIsActiveChatPanel(!isActiveChatPanel));
  };

  const render = () => {
    return (
      <div
        className={`message footer-icon h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] relative rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] ltr:mr-3 lg:ltr:mr-6 rtl:ml-3 lg:rtl:ml-6 flex items-center justify-center cursor-pointer ${
          showTooltip ? 'has-tooltip' : ''
        }`}
        onClick={() => toggleChatPanel()}
      >
        <span className="tooltip">
          {isActiveChatPanel
            ? t('footer.icons.hide-chat-panel')
            : t('footer.icons.show-chat-panel')}
        </span>

        <i className={`pnm-chat ${iconCSS} text-[14px] lg:text-[16px]`} />
        {!isActiveChatPanel && totalUnreadChatMsgs > 0 ? (
          <div className="unseen-message-count bg-brandRed w-5 h-5 rounded-full text-xs text-white absolute -top-2 -right-1 flex justify-center items-center">
            {totalUnreadChatMsgs}
          </div>
        ) : null}
      </div>
    );
  };

  return <>{allowChat ? render() : null}</>;
};

export default ChatIcon;
