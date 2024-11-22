import React, { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';

import { useAppSelector, useAppDispatch, store } from '../../../store';
import { updateIsActiveChatPanel } from '../../../store/slices/bottomIconsActivitySlice';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import { ChatIconSVG } from '../../../assets/Icons/ChatIconSVG';

const ChatIcon = () => {
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  // const { t } = useTranslation();

  const isActiveChatPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveChatPanel,
  );
  const totalUnreadChatMsgs = useAppSelector(
    (state) => state.bottomIconsActivity.totalUnreadChatMsgs,
  );
  // const [iconCSS, setIconCSS] = useState<string>('primaryColor');
  const [allowChat, setAllowChat] = useState<boolean>(true);

  // useEffect(() => {
  //   if (isActiveChatPanel) {
  //     setIconCSS('secondaryColor');
  //   } else {
  //     setIconCSS('primaryColor dark:text-darkText');
  //   }
  // }, [isActiveChatPanel]);

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
        className={`message relative footer-icon flex items-center justify-center cursor-pointer w-11 h-11 rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${
          showTooltip ? 'has-tooltip' : ''
        } ${isActiveChatPanel ? 'bg-gray-100' : 'bg-white'}`}
        onClick={() => toggleChatPanel()}
      >
        {/* <span className="tooltip">
          {isActiveChatPanel
            ? t('footer.icons.hide-chat-panel')
            : t('footer.icons.show-chat-panel')}
        </span> */}

        {/* <i className={`pnm-chat ${iconCSS} text-[14px] lg:text-[16px]`} /> */}
        <ChatIconSVG />
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
