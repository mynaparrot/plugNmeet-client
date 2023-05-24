import React, { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Transition } from '@headlessui/react';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';

import { SpeechToTextTranslationFeatures } from '../../../store/slices/interfaces/session';
import { store } from '../../../store';
import SpeechToTextLangElms from './speechToTextLangElms';
import SubtitleLangElms from './subtitleLangElms';

interface SelectOptionsProps {
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

const SelectOptions = ({
  optionSelectionDisabled,
  speechService,
  recognizer,
  onCloseSelectedOptions,
  onOpenSelectedOptionsModal,
}: SelectOptionsProps) => {
  const { t } = useTranslation();
  const currentUser = store.getState().session.currentUser;

  const [showModal, setShowModal] = useState<boolean>(false);
  const [canShowSpeechSetting, setCanShowSpeechSetting] =
    useState<boolean>(false);
  const [selectedSpeechLang, setSelectedSpeechLang] = useState<string>('');
  const [selectedSubtitleLang, setSelectedSubtitleLang] = useState<string>('');
  const [selectedMicDevice, setSelectedMicDevice] = useState<string>('');

  useEffect(() => {
    const haveUser = speechService.allowed_speech_users?.find(
      (u) => u === currentUser?.userId,
    );
    setCanShowSpeechSetting(!!haveUser);
  }, [currentUser?.userId, speechService]);

  useEffect(() => {
    if (showModal) {
      onOpenSelectedOptionsModal();
    }
    //eslint-disable-next-line
  }, [showModal]);

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

    setShowModal(false);
  };

  const modalElm = () => {
    return (
      <Transition appear show={showModal} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-[9999] overflow-y-auto"
          onClose={() => false}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            </Transition.Child>

            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-lg p-6 my-8 overflow-[initial] text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
                <button
                  className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                </button>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2"
                >
                  {t('speech-services.start-modal-title')}
                </Dialog.Title>
                <hr />
                <div className="mt-6">
                  {canShowSpeechSetting ? (
                    <SpeechToTextLangElms
                      recognizer={recognizer}
                      speechService={speechService}
                      selectedSpeechLang={selectedSpeechLang}
                      setSelectedSpeechLang={setSelectedSpeechLang}
                      selectedMicDevice={selectedMicDevice}
                      setSelectedMicDevice={setSelectedMicDevice}
                    />
                  ) : null}
                  <SubtitleLangElms
                    speechService={speechService}
                    selectedSubtitleLang={selectedSubtitleLang}
                    setSelectedSubtitleLang={setSelectedSubtitleLang}
                  />
                </div>
                <div className="pt-5 bg-gray-50 dark:bg-transparent text-right">
                  <>
                    {canShowSpeechSetting ? (
                      <button
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none"
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
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none"
                      onClick={() => startOrStopService()}
                    >
                      {t('speech-services.start-service')}
                    </button>
                  ) : null}
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    );
  };

  return (
    <div className="show-speech-setting absolute bottom-1 left-1">
      {modalElm()}
      <button onClick={() => setShowModal(true)}>
        <div className="microphone footer-icon relative h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] flex items-center justify-center cursor-pointer has-tooltip">
          <span className="tooltip !-left-3 tooltip-left">
            {t('speech-services.start-modal-title')}
          </span>
          <i className="pnm-closed-captioning primaryColor dark:text-darkText text-[12px] lg:text-[14px]"></i>
        </div>
      </button>
    </div>
  );
};

export default SelectOptions;
