import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import Modal from '../../helpers/ui/modal';
import Tabs, { ITabItem } from '../../helpers/ui/tabs';
import { updateDisplayInsightsAISettingsModal } from '../../store/slices/bottomIconsActivitySlice';
import AiTextChatSettings from './ai-text-chat/settings';
import MeetingSummarization from './meeting-summarization/settings';

const InsightsAiSettingsModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  // static values
  const { aiFeatures } = useMemo(() => {
    const insightsFeatures =
      store.getState().session.currentRoom.metadata?.roomFeatures
        ?.insightsFeatures;

    return {
      aiFeatures: insightsFeatures?.aiFeatures,
    };
  }, []);

  const showAISettingsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showInsightsAISettingsModal,
  );
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [tabItems, setTabItems] = useState<ITabItem[]>([]);

  const closeModal = useCallback(() => {
    dispatch(updateDisplayInsightsAISettingsModal(!showAISettingsModal));
  }, [dispatch, showAISettingsModal]);

  useEffect(() => {
    const insightsFeatures =
      store.getState().session.currentRoom.metadata?.roomFeatures
        ?.insightsFeatures;
    if (!insightsFeatures?.isAllow || !insightsFeatures?.aiFeatures?.isAllow) {
      return;
    }

    const aiFeatures = insightsFeatures?.aiFeatures;

    // now display tabs
    const tabItems: ITabItem[] = [];
    if (aiFeatures?.aiTextChatFeatures?.isAllow) {
      tabItems.push({
        id: 1,
        title: t('insights.tab-ai-text-chat-title'),
        content: (
          <AiTextChatSettings
            setErrorMsg={setErrorMsg}
            closeModal={closeModal}
          />
        ),
      });
    }
    if (aiFeatures?.meetingSummarizationFeatures?.isAllow) {
      tabItems.push({
        id: 2,
        title: t('insights.tab-meeting-summarization-title'),
        content: (
          <MeetingSummarization
            setErrorMsg={setErrorMsg}
            closeModal={closeModal}
          />
        ),
      });
    }
    setTabItems(tabItems);
  }, [t, setErrorMsg, closeModal]);

  if (!aiFeatures?.isAllow) {
    return null;
  }

  return (
    showAISettingsModal && (
      <Modal
        show={showAISettingsModal}
        onClose={closeModal}
        title={t('insights.setting-modal-title')}
        maxWidth="max-w-2xl showAISettingsModal"
      >
        <div className="-mx-4">
          {errorMsg && (
            <div className="error-msg text-xs text-red-600 py-1 px-2 mb-3">
              {errorMsg}
            </div>
          )}
          {tabItems.length && <Tabs items={tabItems} vertical />}
        </div>
      </Modal>
    )
  );
};

export default InsightsAiSettingsModal;
