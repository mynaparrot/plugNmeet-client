import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import {
  SupportedLangs,
  supportedSpeechToTextLangs,
  supportedTranslationLangs,
} from '../helpers/supportedLangs';
import { SpeechToTextTranslationFeatures } from '../../../store/slices/interfaces/session';

interface SubtitleLangElmsPros {
  speechService: SpeechToTextTranslationFeatures;
  selectedSubtitleLang: string;
  setSelectedSubtitleLang: React.Dispatch<string>;
}

const SubtitleLangElms = ({
  speechService,
  selectedSubtitleLang,
  setSelectedSubtitleLang,
}: SubtitleLangElmsPros) => {
  const { t } = useTranslation();

  const render = () => {
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
        <Listbox
          value={selectedSubtitleLang}
          onChange={setSelectedSubtitleLang}
        >
          <div className="relative mt-1 w-[150px] sm:w-[200px]">
            <Listbox.Button className="relative h-9 w-full cursor-default py-1 pl-3 pr-7 text-left border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm">
              <span className="block truncate">
                {displayLangs
                  .map((l) => (l.code === selectedSubtitleLang ? l.name : null))
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
  };

  return render();
};

export default SubtitleLangElms;
