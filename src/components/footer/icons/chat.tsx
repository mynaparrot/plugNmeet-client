import React, { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';

import { useAppSelector, useAppDispatch, store } from '../../../store';
import {
  updateIsActiveChatPanel,
  updateIsEnabledExtendedVerticalCamView,
} from '../../../store/slices/bottomIconsActivitySlice';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import { ChatIconSVG } from '../../../assets/Icons/ChatIconSVG';

const ChatIcon = () => {
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const isRecorder = store.getState().session.currentUser?.isRecorder;
  // const { t } = useTranslation();

  const isActiveChatPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveChatPanel,
  );
  const totalUnreadChatMsgs = useAppSelector(
    (state) => state.bottomIconsActivity.totalUnreadChatMsgs,
  );
  // const [iconCSS, setIconCSS] = useState<string>('primaryColor');
  const [allowChat, setAllowChat] = useState<boolean>(true);

  useEffect(() => {
    // if (isActiveChatPanel) {
    //   setIconCSS('secondaryColor');
    // } else {
    //   setIconCSS('primaryColor dark:text-darkText');
    // }
    if (isActiveChatPanel && !isRecorder) {
      dispatch(updateIsEnabledExtendedVerticalCamView(false));
    }
    //eslint-disable-next-line
  }, [isActiveChatPanel]);

  useEffect(() => {
    const metadata = store.getState().session.currentRoom
      .metadata as IRoomMetadata;
    if (!metadata.roomFeatures?.chatFeatures?.allowChat) {
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
        className={`message relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${isActiveChatPanel ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
        onClick={() => toggleChatPanel()}
      >
        <div
          className={`h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${
            showTooltip ? 'has-tooltip' : ''
          } ${isActiveChatPanel ? 'bg-gray-100' : 'bg-white'}`}
        >
          {/* <span className="tooltip">
          {isActiveChatPanel
            ? t('footer.icons.hide-chat-panel')
            : t('footer.icons.show-chat-panel')}
        </span> */}
          <ChatIconSVG />
          {!isActiveChatPanel && totalUnreadChatMsgs > 0 ? (
            <div className="unseen-message-count bg-secondaryColor w-4 3xl:w-5 h-4 3xl:h-5 rounded-full text-[10px] 3xl:text-xs text-white absolute -top-2 -right-1 flex justify-center items-center">
              {totalUnreadChatMsgs}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return <>{allowChat ? render() : null}</>;
};

export default ChatIcon;
