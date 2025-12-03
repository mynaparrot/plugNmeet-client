import React, { useCallback, useEffect, useState } from 'react';
import { store, useAppDispatch, useAppSelector } from '../../store';
import { useTranslation } from 'react-i18next';

import Tabs, { ITabItem } from '../../helpers/ui/tabs';
import Modal from '../../helpers/ui/modal';
import { updateDisplaySpeechSettingsModal } from '../../store/slices/bottomIconsActivitySlice';
import TranscriptionSettings from './transcription-settings';
import ChatTranslationSettings from './chat-translation-settings';
import {
  supportedTranscriptionLangs,
  supportedTranslationLangs,
} from './helpers/supportedLangs';

const TranslationTranscriptionSettingModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const showSpeechSettingsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showSpeechSettingsModal,
  );

  const [tabItems, setTabItems] = useState<ITabItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  useEffect(() => {
    const state = store.getState();
    const insightsFeatures =
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures;
    if (!insightsFeatures || !insightsFeatures.isAllow) {
      return;
    }
    // prepare languages
    Promise.allSettled([
      supportedTranscriptionLangs(),
      supportedTranslationLangs(),
    ]).then(() => {
      // now display tabs
      const tabItems: ITabItem[] = [];
      if (insightsFeatures.transcriptionFeatures?.isAllow) {
        tabItems.push({
          id: 1,
          title: t('speech-services.speech-transcription'),
          content: <TranscriptionSettings setErrorMsg={setErrorMsg} />,
        });
      }
      if (insightsFeatures.chatTranslationFeatures?.isAllow) {
        tabItems.push({
          id: 2,
          title: t('speech-services.chat-translation'),
          content: <ChatTranslationSettings setErrorMsg={setErrorMsg} />,
        });
      }
      setTabItems(tabItems);
    });
    //oxlint-disable-next-line
  }, []);

  const onCloseModal = useCallback(() => {
    dispatch(updateDisplaySpeechSettingsModal(!showSpeechSettingsModal));
  }, [dispatch, showSpeechSettingsModal]);

  return (
    <Modal
      show={showSpeechSettingsModal}
      onClose={onCloseModal}
      title={t('speech-services.start-modal-title')}
      customClass="overflow-hidden"
      maxWidth="max-w-2xl"
    >
      <div className="-mx-4">
        {errorMsg && (
          <div className="error-msg text-xs text-red-600 py-1 px-2">
            {errorMsg}
          </div>
        )}
        {tabItems.length && <Tabs items={tabItems} vertical />}
      </div>
    </Modal>
  );
};

export default TranslationTranscriptionSettingModal;
