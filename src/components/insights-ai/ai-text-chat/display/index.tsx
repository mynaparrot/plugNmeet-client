import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { setActiveSidePanel } from '../../../../store/slices/bottomIconsActivitySlice';
import { CloseIconSVG } from '../../../../assets/Icons/CloseIconSVG';
import { useAppDispatch, useAppSelector } from '../../../../store';
import TextBoxArea from './textBoxArea';
import FinalMessages from './finalMessages';
import InterimMessage from './interimMessage';

export interface formatedDisplayData {
  id: string;
  text: string;
  createdAt: string;
}

const InsightsAiTextChat = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const insightsAiTextChat = useAppSelector(
    (state) =>
      state.session.currentRoom?.metadata?.roomFeatures?.insightsFeatures
        ?.aiFeatures?.aiTextChatFeatures,
  );

  const close = useCallback(() => {
    dispatch(setActiveSidePanel(null));
  }, [dispatch]);

  if (!insightsAiTextChat?.isEnabled) {
    return null;
  }

  return (
    <div className="relative z-10 w-full bg-Gray-25 border-l border-Gray-200 h-full">
      <div
        className="inline-block absolute z-50 right-3 3xl:right-5 top-[10px] 3xl:top-[18px] text-Gray-600 cursor-pointer"
        onClick={close}
      >
        <CloseIconSVG />
      </div>
      <div className="inner-wrapper relative z-20 w-full h-full flex flex-col">
        <div className="top flex items-center h-10 3xl:h-14 px-3 3xl:px-5 border-b border-Gray-200 shrink-0">
          <p className="text-sm 3xl:text-base text-Gray-950 font-medium leading-tight">
            {t('insights.ai-text-chat.panel-title')}
          </p>
        </div>
        <div className="polls-list-wrapper relative overflow-auto scrollBar px-3 3xl:px-5 pt-2 xl:pt-3 flex-grow">
          <FinalMessages />
          <InterimMessage />
        </div>
        <div className="message-form z-30 border-t border-Gray-200 bg-white w-full px-3 3xl:px-5 py-2 3xl:py-4 flex items-center shrink-0">
          <TextBoxArea />
        </div>
      </div>
    </div>
  );
};

export default InsightsAiTextChat;
