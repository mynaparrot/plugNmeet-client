import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { Dialog, Listbox, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';

import { store } from '../../store';
import { SpeechToTextTranslationFeatures } from '../../store/slices/interfaces/session';
import {
  SupportedLangs,
  supportedSpeechToTextLangs,
  supportedTranslationLangs,
} from './helpers/supportedLangs';

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
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';
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
      <div className="flex items-center justify-between">
        <label
          htmlFor="language"
          className="pr-4 w-auto dark:text-darkText text-sm"
        >
          {t('speech-services.speech-lang-label')}
        </label>
        <Listbox
          value={selectedSpeechLang}
          onChange={setSelectedSpeechLang}
          disabled={recognizer !== undefined}
        >
          <div className="relative mt-1 w-[150px] sm:w-[200px]">
            <Listbox.Button
              className={`relative h-9 w-full cursor-default py-1 pl-3 pr-7 text-left border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                recognizer !== undefined ? 'opacity-70' : ''
              }`}
            >
              <span className="block truncate">
                {supportedSpeechToTextLangs
                  .map((l) => (l.code === selectedSpeechLang ? l.name : null))
                  .join('')}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                  />
                </svg>
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full scrollBar scrollBar4 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {speechService.allowed_speech_langs?.map((l) => (
                  <Listbox.Option
                    key={l}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-7 pr-4 ${
                        active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                      }`
                    }
                    value={l}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {
                            supportedSpeechToTextLangs.filter(
                              (lang) => lang.code === l,
                            )[0].name
                          }
                        </span>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-amber-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                          </span>
                        ) : null}
                      </>
                    )}
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
      <div className="flex items-center justify-between mt-2">
        <label
          htmlFor="language"
          className="pr-4 w-auto dark:text-darkText text-sm"
        >
          {t('speech-services.subtitle-lang-label')}
        </label>
        <Listbox value={subtitleLang} onChange={setSubtitleLang}>
          <div className="relative mt-1 w-[150px] sm:w-[200px]">
            <Listbox.Button className="relative h-9 w-full cursor-default py-1 pl-3 pr-7 text-left border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm">
              <span className="block truncate">
                {displayLangs
                  .map((l) => (l.code === subtitleLang ? l.name : null))
                  .join('')}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                  />
                </svg>
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto scrollBar scrollBar4 rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {displayLangs.map((l) => (
                  <Listbox.Option
                    key={l.code}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-7 pr-4 ${
                        active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                      }`
                    }
                    value={l.code}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {l.name}
                        </span>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-amber-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                          </span>
                        ) : null}
                      </>
                    )}
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
    <div className="show-speech-setting absolute bottom-1 left-1">
      {modalElm()}
      <button onClick={() => setShowModal(true)}>
        <img
          className="w-7 h-7"
          src={`${assetPath}/imgs/text_to_speech_icon_135108.svg`}
          alt="sdasd"
        />
      </button>
    </div>
  );
};

export default SelectOptionBtn;
