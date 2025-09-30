import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateIsActiveChatPanel,
  updateIsEnabledExtendedVerticalCamView,
} from '../../../store/slices/bottomIconsActivitySlice';
import { ChatIconSVG } from '../../../assets/Icons/ChatIconSVG';

const ChatIcon = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { showTooltip, isRecorder } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
      isRecorder: !!session.currentUser?.isRecorder,
    };
  }, []);

  const isActiveChatPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveChatPanel,
  );
  const totalUnreadChatMsgs = useAppSelector(
    (state) => state.bottomIconsActivity.totalUnreadChatMsgs,
  );

  useEffect(() => {
    if (isActiveChatPanel && !isRecorder) {
      dispatch(updateIsEnabledExtendedVerticalCamView(false));
    }
  }, [isActiveChatPanel, isRecorder, dispatch]);

  const toggleChatPanel = useCallback(() => {
    dispatch(updateIsActiveChatPanel(!isActiveChatPanel));
  }, [dispatch, isActiveChatPanel]);

  const wrapperClasses = clsx(
    'message relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
    {
      'border-[rgba(124,206,247,0.25)]': isActiveChatPanel,
      'border-transparent': !isActiveChatPanel,
    },
  );

  const innerDivClasses = clsx(
    'h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100': isActiveChatPanel,
      'bg-white': !isActiveChatPanel,
    },
  );

  return (
    <div className={wrapperClasses} onClick={toggleChatPanel}>
      <div className={innerDivClasses}>
        <span className="tooltip">
          {isActiveChatPanel
            ? t('footer.icons.hide-chat-panel')
            : t('footer.icons.show-chat-panel')}
        </span>
        <ChatIconSVG />
        {!isActiveChatPanel && totalUnreadChatMsgs > 0 && (
          <div className="unseen-message-count bg-secondary-color w-4 3xl:w-5 h-4 3xl:h-5 rounded-full text-[10px] 3xl:text-xs text-white absolute -top-2 -right-1 flex justify-center items-center">
            {totalUnreadChatMsgs}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatIcon;
