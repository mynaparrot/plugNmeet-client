import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { setActiveSidePanel } from '../../../store/slices/bottomIconsActivitySlice';
import { AiIconSVG } from '../../../assets/Icons/AiIconSVG';

const InsightsAiTextChatIcon = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { showTooltip } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
    };
  }, []);

  const isEnabled = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.aiFeatures?.aiTextChatFeatures?.isEnabled,
  );

  const isActivePanel = useAppSelector(
    (state) =>
      state.bottomIconsActivity.activeSidePanel === 'INSIGHTS_AI_TEXT_CHAT',
  );
  const totalUnreadChatMsgs = useAppSelector(
    (state) => state.bottomIconsActivity.totalUnreadChatMsgs,
  );

  const togglePanel = useCallback(() => {
    dispatch(setActiveSidePanel('INSIGHTS_AI_TEXT_CHAT'));
  }, [dispatch]);

  if (!isEnabled) {
    return null;
  }

  const wrapperClasses = clsx(
    'message relative footer-icon cursor-pointer w-10 md:w-11 3xl:w-[52px] h-10 md:h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
    {
      'border-[rgba(124,206,247,0.25)] dark:border-Gray-800': isActivePanel,
      'border-transparent': !isActivePanel,
    },
  );

  const innerDivClasses = clsx(
    'h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 dark:border-Gray-700 shadow transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100 dark:bg-Gray-700': isActivePanel,
      'bg-white dark:bg-Gray-800': !isActivePanel,
    },
  );

  return (
    <div className={wrapperClasses} onClick={togglePanel}>
      <div className={innerDivClasses}>
        <span className="tooltip">
          {isActivePanel
            ? t('footer.icons.hide-ai-chat-panel')
            : t('footer.icons.show-ai-chat-panel')}
        </span>
        <AiIconSVG classes="h-auto w-4 3xl:w-5" />
        {!isActivePanel && totalUnreadChatMsgs > 0 && (
          <div className="unseen-message-count bg-secondary-color w-4 3xl:w-5 h-4 3xl:h-5 rounded-full text-[10px] 3xl:text-xs text-white absolute -top-2 -right-1 flex justify-center items-center">
            {totalUnreadChatMsgs}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsAiTextChatIcon;
