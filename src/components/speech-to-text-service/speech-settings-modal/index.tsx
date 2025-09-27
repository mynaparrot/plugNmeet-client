import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { isEmpty } from 'es-toolkit/compat';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import { SpeechToTextTranslationFeatures } from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';
import { updateDisplaySpeechSettingOptionsModal } from '../../../store/slices/bottomIconsActivitySlice';

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
    <div className="show-speech-setting absolute bottom-14 left-2">
      <Transition appear show={isActiveDisplayOptionsModal} as={Fragment}>
        <Dialog
          as="div"
          className="showSpeechSettingPopup fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70"
          onClose={() => false}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="w-full max-w-lg bg-white border border-Gray-200 shadow-virtualPOP rounded-xl duration-300 ease-out">
                <DialogTitle
                  as="h3"
                  className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 py-5 px-5 text-Gray-950 border-b border-Gray-100"
                >
                  <span>{t('speech-services.start-modal-title')}</span>
                  <Button
                    onClick={() => toggleDisplayOptionsModal()}
                    className="cursor-pointer"
                  >
                    <PopupCloseSVGIcon classes="text-Gray-600" />
                  </Button>
                </DialogTitle>
                <div className="grid gap-4">
                  {canShowSpeechSetting ? (
                    <SpeechInputSettings
                      recognizer={recognizer}
                      speechService={speechService}
                      selectedSpeechLang={selectedSpeechLang}
                      setSelectedSpeechLang={setSelectedSpeechLang}
                      selectedMicDevice={selectedMicDevice}
                      setSelectedMicDevice={setSelectedMicDevice}
                    />
                  ) : null}
                  <SubtitleLangSelector
                    speechService={speechService}
                    selectedSubtitleLang={selectedSubtitleLang}
                    setSelectedSubtitleLang={setSelectedSubtitleLang}
                  />
                  <SubtitleFontSizeSlider />
                </div>
                <div className="bottom-area py-5 px-5 text-Gray-950 border-t border-Gray-100 flex justify-end gap-5">
                  <>
                    {canShowSpeechSetting ? (
                      <button
                        className="h-10 px-8 w-1/2 cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
                        onClick={() => startOrStopService()}
                      >
                        {recognizer
                          ? t('speech-services.stop-service')
                          : t('speech-services.start-service')}
                      </button>
                    ) : null}
                  </>
                  {!canShowSpeechSetting ? (
                    <button
                      className="h-10 px-8 w-1/2 cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
                      onClick={() => startOrStopService()}
                    >
                      {t('speech-services.start-service')}
                    </button>
                  ) : null}
                </div>
              </div>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default SpeechSettingsModal;
