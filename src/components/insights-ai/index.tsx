import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import Modal from '../../helpers/ui/modal';
import { updateDisplayInsightsAISettingsModal } from '../../store/slices/bottomIconsActivitySlice';
import AiTextChatSettings from './ai-text-chat/settings';

const InsightsAiSettingsModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  // static values
  const { isAllowAiTextChat } = useMemo(() => {
    const insightsFeatures =
      store.getState().session.currentRoom.metadata?.roomFeatures
        ?.insightsFeatures;

    return {
      isAllowAiTextChat:
        !!insightsFeatures?.aiFeatures?.isAllow &&
        !!insightsFeatures?.aiFeatures?.aiTextChatFeatures?.isAllow,
    };
  }, []);

  const showAISettingsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showInsightsAISettingsModal,
  );
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  const closeModal = useCallback(() => {
    dispatch(updateDisplayInsightsAISettingsModal(!showAISettingsModal));
  }, [dispatch, showAISettingsModal]);

  return (
    showAISettingsModal && (
      <Modal
        show={showAISettingsModal}
        onClose={closeModal}
        title={t('insights.setting-modal-title')}
        maxWidth="max-w-2xl"
      >
        {errorMsg && (
          <div className="error-msg text-xs text-red-600 py-1">{errorMsg}</div>
        )}
        {isAllowAiTextChat && (
          <AiTextChatSettings
            setErrorMsg={setErrorMsg}
            closeModal={closeModal}
          />
        )}
      </Modal>
    )
  );
};

export default InsightsAiSettingsModal;
