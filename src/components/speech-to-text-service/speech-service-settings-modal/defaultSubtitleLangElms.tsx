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
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';

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
    <div className="">
      <label
        htmlFor="language"
        className="w-full text-sm font-medium text-Gray-800 ltr:text-left rtl:text-right block mb-2"
      >
        {t('speech-services.default-subtitle-lang-label')}
      </label>
      <Listbox
        value={selectedDefaultSubtitleLang}
        onChange={setSelectedDefaultSubtitleLang}
        multiple={false}
      >
        <div className="relative w-full">
          <ListboxButton className="min-h-11 full rounded-2xl border border-Gray-300 bg-white shadow-input w-full px-3 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm text-Gray-950">
            <span className="block truncate">
              {availableSubtitleLangs
                .map((l) =>
                  l && l.code === selectedDefaultSubtitleLang ? l.name : '',
                )
                .join('')}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
              <DropdownIconSVG />
            </span>
          </ListboxButton>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdown-menu border border-Gray-100 focus:outline-hidden scrollBar scrollBar2 grid gap-0.5">
              {availableSubtitleLangs.map((l) => (
                <ListboxOption
                  key={`trans_${l.code}`}
                  className={({ focus, selected }) =>
                    `relative cursor-default select-none py-2 px-3 rounded-[8px] ${
                      focus ? 'bg-Blue2-50' : ''
                    } ${selected ? 'bg-Blue2-50' : ''}`
                  }
                  value={l.code}
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate`}>{l.name}</span>
                      {selected ? (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                          <CheckMarkIcon />
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
