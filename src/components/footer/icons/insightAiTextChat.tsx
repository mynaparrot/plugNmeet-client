import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateIsActiveInsightsAiTextChat } from '../../../store/slices/bottomIconsActivitySlice';
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

  const isActiveAiTextChat = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveInsightsAiTextChat,
  );

  const togglePanel = useCallback(() => {
    dispatch(updateIsActiveInsightsAiTextChat(!isActiveAiTextChat));
  }, [dispatch, isActiveAiTextChat]);

  if (!isEnabled) {
    return null;
  }

  const wrapperClasses = clsx(
    'message relative footer-icon cursor-pointer w-10 md:w-11 3xl:w-[52px] h-10 md:h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
    {
      'border-[rgba(124,206,247,0.25)] dark:border-Gray-800':
        isActiveAiTextChat,
      'border-transparent': !isActiveAiTextChat,
    },
  );

  const innerDivClasses = clsx(
    'footer-icon-bg h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 dark:border-Gray-700 shadow transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100 dark:bg-Gray-700': isActiveAiTextChat,
      'bg-white dark:bg-Gray-800': !isActiveAiTextChat,
    },
  );

  return (
    <div className={wrapperClasses} onClick={togglePanel}>
      <div className={innerDivClasses}>
        <span className="tooltip">
          {isActiveAiTextChat
            ? t('footer.icons.hide-ai-chat-panel')
            : t('footer.icons.show-ai-chat-panel')}
        </span>
        <AiIconSVG classes="h-auto w-4 3xl:w-5" />
      </div>
    </div>
  );
};

export default InsightsAiTextChatIcon;
