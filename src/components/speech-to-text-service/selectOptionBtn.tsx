import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { Dialog, Listbox, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch } from '../../store';
import { SpeechToTextTranslationFeatures } from '../../store/slices/interfaces/session';
import {
  SupportedLangs,
  supportedSpeechToTextLangs,
  supportedTranslationLangs,
} from './helpers/supportedLangs';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';

interface SelectOptionBtnProps {
  speechService: SpeechToTextTranslationFeatures;
  recognizer: SpeechRecognizer | TranslationRecognizer | undefined;
  onCloseSelectedOptions: (selected: OnCloseSelectedOptions) => void;
}

export interface OnCloseSelectedOptions {
  speechLang: string;
  subtitleLang: string;
  stopService: boolean;
}

const SelectOptionBtn = ({
  speechService,
  recognizer,
  onCloseSelectedOptions,
}: SelectOptionBtnProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const currentUser = store.getState().session.currentUser;

  const [showModal, setShowModal] = useState<boolean>(false);
  const [canShowSpeechSetting, setCanShowSpeechSetting] =
    useState<boolean>(false);
  const [selectedSpeechLang, setSelectedSpeechLang] = useState<string>('');
  const [subtitleLang, setSubtitleLang] = useState<string>('');

  useEffect(() => {
    const haveUser = speechService.allowed_speech_users?.filter(
      (u) => u === currentUser?.userId,
    );
    setCanShowSpeechSetting(!!haveUser);
  }, [currentUser?.userId, speechService]);

  const speechElms = useCallback(() => {
    return (
      <div className="flex items-center justify-start">
        <label htmlFor="language" className="pr-4 w-full dark:text-darkText">
          {t('speech-services.speech-lang-label')}
        </label>
        <Listbox
          value={selectedSpeechLang}
          onChange={setSelectedSpeechLang}
          disabled={recognizer !== undefined}
        >
          <div className="relative mt-1">
            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
              <span className="block truncate">
                {supportedSpeechToTextLangs
                  .map((l) => (l.code === selectedSpeechLang ? l.name : null))
                  .join('')}
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {speechService.allowed_speech_langs?.map((l) => (
                  <Listbox.Option
                    key={l}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                      }`
                    }
                    value={l}
                  >
                    {
                      supportedSpeechToTextLangs.filter(
                        (lang) => lang.code === l,
                      )[0].name
                    }
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </div>
    );
  }, [recognizer, selectedSpeechLang, speechService, t]);

  const displayLangElms = useCallback(() => {
    const displayLangs: Array<SupportedLangs> = [];
    speechService.allowed_speech_langs?.map((l) => {
      const r = supportedSpeechToTextLangs.filter((lang) => lang.code === l);
      if (r) {
        displayLangs.push({
          code: r[0].code.split('-')[0],
          name: r[0].name,
        });
      }
    });

    if (speechService.is_enabled_translation) {
      const transLangs = speechService.allowed_trans_langs?.map((l) => {
        return supportedTranslationLangs.filter((lang) => lang.code === l)?.[0];
      });
      if (transLangs?.length) {
        displayLangs.push(...transLangs);
      }
    }

    return (
      <div className="flex items-center justify-start">
        <label htmlFor="language" className="pr-4 w-full dark:text-darkText">
          {t('speech-services.subtitle-lang-label')}
        </label>
        <Listbox value={subtitleLang} onChange={setSubtitleLang}>
          <div className="relative mt-1">
            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
              <span className="block truncate">
                {displayLangs
                  .map((l) => (l.code === subtitleLang ? l.name : null))
                  .join('')}
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {displayLangs.map((l) => (
                  <Listbox.Option
                    key={l.code}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                      }`
                    }
                    value={l.code}
                  >
                    {l.name}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </div>
    );
  }, [subtitleLang, speechService, t]);

  const startOrStopService = () => {
    onCloseSelectedOptions({
      speechLang: selectedSpeechLang,
      subtitleLang: subtitleLang,
      stopService: !!recognizer,
    });
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
              <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
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
                <div className="mt-6" style={{ height: '300px' }}>
                  {canShowSpeechSetting ? speechElms() : null}
                  {displayLangElms()}
                </div>
                <div className="py-3 bg-gray-50 dark:bg-transparent text-right">
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
    <div>
      {modalElm()}
      <button onClick={() => setShowModal(true)}>Show settings</button>
    </div>
  );
};

export default SelectOptionBtn;
