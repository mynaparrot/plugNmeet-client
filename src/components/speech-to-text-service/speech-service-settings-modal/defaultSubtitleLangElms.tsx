import React, { Dispatch, Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';

import { getSubtitleLangs, SupportedLangs } from '../helpers/supportedLangs';

interface DefaultSubtitleLangElmsPros {
  selectedSpeechLangs: string[];
  selectedTransLangs: string[];
  selectedDefaultSubtitleLang: string;
  setSelectedDefaultSubtitleLang: Dispatch<string>;
}
const DefaultSubtitleLangElms = ({
  selectedSpeechLangs,
  selectedTransLangs,
  selectedDefaultSubtitleLang,
  setSelectedDefaultSubtitleLang,
}: DefaultSubtitleLangElmsPros) => {
  const { t } = useTranslation();
  const [availableSubtitleLangs, setAvailableSubtitleLangs] = useState<
    SupportedLangs[]
  >([]);

  useEffect(() => {
    const langs = getSubtitleLangs(selectedSpeechLangs, selectedTransLangs);
    setAvailableSubtitleLangs(langs);
  }, [selectedSpeechLangs, selectedTransLangs, t]);

  return (
    <div className="flex items-center justify-between">
      <label
        htmlFor="language"
        className="pr-4 w-auto dark:text-darkText text-sm"
      >
        {t('speech-services.default-subtitle-lang-label')}
      </label>
      <Listbox
        value={selectedDefaultSubtitleLang}
        onChange={setSelectedDefaultSubtitleLang}
        multiple={false}
      >
        <div className="relative mt-1 w-[150px] sm:w-[250px]">
          <ListboxButton className="relative mt-1 min-h-[36px] w-full cursor-default py-1 pl-3 pr-7 text-left border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm">
            <span className="block">
              {availableSubtitleLangs
                .map((l) =>
                  l && l.code === selectedDefaultSubtitleLang ? l.name : '',
                )
                .join('')}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 ">
              <i className="pnm-updown text-xl primaryColor dark:text-darkText" />
            </span>
          </ListboxButton>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto scrollBar scrollBar4 rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {availableSubtitleLangs.map((l) => (
                <ListboxOption
                  key={`trans_${l.code}`}
                  className={({ focus }) =>
                    `relative cursor-default select-none py-2 pr-4 pl-7 ${
                      focus ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
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
                          <i className="pnm-check w-4 h-4" />
                        </span>
                      ) : null}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default DefaultSubtitleLangElms;
