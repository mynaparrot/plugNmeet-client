import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isEmpty } from 'es-toolkit/compat';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import { SpeechToTextTranslationFeatures } from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateDisplaySpeechSettingOptionsModal } from '../../../store/slices/bottomIconsActivitySlice';

import Modal from '../../../helpers/ui/modal';
import SpeechInputSettings from './speechInputSettings';
import SubtitleFontSizeSlider from './subtitleFontSizeSlider';
import SubtitleLangSelector from './subtitleLangSelector';

interface SpeechSettingsModalProps {
  optionSelectionDisabled: boolean;
  speechService: SpeechToTextTranslationFeatures;
  recognizer: SpeechRecognizer | TranslationRecognizer | undefined;
  onCloseSelectedOptions: (selected: OnCloseSelectedOptions) => void;
  onOpenSelectedOptionsModal: () => void;
}

export interface OnCloseSelectedOptions {
  speechLang: string;
  subtitleLang: string;
  micDevice: string;
  stopService: boolean;
}

const SpeechSettingsModal = ({
  optionSelectionDisabled,
  speechService,
  recognizer,
  onCloseSelectedOptions,
  onOpenSelectedOptionsModal,
}: SpeechSettingsModalProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currentUser = store.getState().session.currentUser;
  const isActiveDisplayOptionsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showSpeechSettingOptionsModal,
  );

  const [selectedSpeechLang, setSelectedSpeechLang] = useState<string>('');
  const [selectedSubtitleLang, setSelectedSubtitleLang] = useState<string>(
    () => {
      const current = store.getState().speechServices.selectedSubtitleLang;
      if (!isEmpty(current)) {
        return current;
      }
      return speechService.defaultSubtitleLang ?? '';
    },
  );
  const [selectedMicDevice, setSelectedMicDevice] = useState<string>('');

  const canShowSpeechSetting = useMemo(() => {
    return !!speechService.allowedSpeechUsers?.find(
      (u) => u === currentUser?.userId,
    );
  }, [currentUser?.userId, speechService.allowedSpeechUsers]);

  useEffect(() => {
    if (isActiveDisplayOptionsModal) {
      onOpenSelectedOptionsModal();
    }
    //eslint-disable-next-line
  }, [isActiveDisplayOptionsModal]);

  const toggleDisplayOptionsModal = useCallback(() => {
    dispatch(
      updateDisplaySpeechSettingOptionsModal(!isActiveDisplayOptionsModal),
    );
  }, [dispatch, isActiveDisplayOptionsModal]);

  const startOrStopService = () => {
    if (optionSelectionDisabled) {
      return;
    }
    if (canShowSpeechSetting) {
      onCloseSelectedOptions({
        speechLang: selectedSpeechLang,
        subtitleLang: selectedSubtitleLang,
        micDevice: selectedMicDevice,
        stopService: !!recognizer,
      });
    } else {
      onCloseSelectedOptions({
        speechLang: '',
        subtitleLang: selectedSubtitleLang,
        micDevice: '',
        stopService: false,
      });
    }

    toggleDisplayOptionsModal();
  };

  return (
    <Modal
      show={isActiveDisplayOptionsModal}
      onClose={() => dispatch(updateDisplaySpeechSettingOptionsModal(false))}
      title={t('speech-services.start-modal-title')}
      customClass="showSpeechSettingPopup"
    >
      <div className="-mx-4">
        {canShowSpeechSetting && (
          <SpeechInputSettings
            recognizer={recognizer}
            speechService={speechService}
            selectedSpeechLang={selectedSpeechLang}
            setSelectedSpeechLang={setSelectedSpeechLang}
            selectedMicDevice={selectedMicDevice}
            setSelectedMicDevice={setSelectedMicDevice}
          />
        )}
        <SubtitleLangSelector
          speechService={speechService}
          selectedSubtitleLang={selectedSubtitleLang}
          setSelectedSubtitleLang={setSelectedSubtitleLang}
        />
        <SubtitleFontSizeSlider />
      </div>
      <div className="bottom-area pt-4 mt-4 text-Gray-950 border-t border-Gray-100 flex justify-end gap-5 -mx-4 px-4">
        <button
          className="h-10 px-8 w-1/2 cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
          onClick={() => startOrStopService()}
        >
          {canShowSpeechSetting && recognizer
            ? t('speech-services.stop-service')
            : t('speech-services.start-service')}
        </button>
      </div>
    </Modal>
  );
};

export default SpeechSettingsModal;
