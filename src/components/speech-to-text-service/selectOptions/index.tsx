import React, { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
  Button,
} from '@headlessui/react';
import { isEmpty } from 'es-toolkit/compat';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import { SpeechToTextTranslationFeatures } from 'plugnmeet-protocol-js';

import { store } from '../../../store';
import SpeechToTextLangElms from './speechToTextLangElms';
import SubtitleLangElms from './subtitleLangElms';
import SubtitleFontSize from './subtitleFontSize';
import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';

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
    const selectedSubtitleLang =
      store.getState().speechServices.selectedSubtitleLang;
    if (!isEmpty(selectedSubtitleLang)) {
      setSelectedSubtitleLang(selectedSubtitleLang);
    } else {
      if (speechService.defaultSubtitleLang) {
        setSelectedSubtitleLang(speechService.defaultSubtitleLang);
      }
    }
    //eslint-disable-next-line
  }, []);

  useEffect(() => {
    const haveUser = speechService.allowedSpeechUsers?.find(
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
                    onClick={() => setShowModal(false)}
                    className="cursor-pointer"
                  >
                    <PopupCloseSVGIcon classes="text-Gray-600" />
                  </Button>
                </DialogTitle>
                <div className="grid gap-4">
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
                  <SubtitleFontSize />
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
    );
  };

  return (
    <div className="show-speech-setting absolute bottom-14 left-2">
      {modalElm()}
      <button onClick={() => setShowModal(true)}>
        <div className="chat-history-settings relative h-11 w-11 rounded-full bg-Gray-950/70 cursor-pointer has-tooltip border-4 border-white/5 shadow-virtual-item flex items-center justify-center has-tooltip">
          {/* <span className="tooltip -left-3! ltr:tooltip-left rtl:tooltip-right">
            {t('speech-services.subtitle-settings')}
          </span> */}
          <i
            className={`pnm-closed-captioning text-white text-[12px] lg:text-[14px] ${
              showModal ? 'secondaryColor' : 'primaryColor'
            }`}
          ></i>
        </div>
      </button>
    </div>
  );
};

export default SelectOptions;
