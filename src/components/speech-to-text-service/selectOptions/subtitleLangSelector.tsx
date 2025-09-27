import React, { Fragment, useMemo } from 'react';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { SpeechToTextTranslationFeatures } from 'plugnmeet-protocol-js';

import { getSubtitleLangs } from '../helpers/supportedLangs';
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';

interface ISubtitleLangSelectorProps {
  speechService: SpeechToTextTranslationFeatures;
  selectedSubtitleLang: string;
  setSelectedSubtitleLang: React.Dispatch<string>;
}

const SubtitleLangSelector = ({
  speechService,
  selectedSubtitleLang,
  setSelectedSubtitleLang,
}: ISubtitleLangSelectorProps) => {
  const { t } = useTranslation();

  const displayLangs = useMemo(() => {
    return getSubtitleLangs(
      speechService.allowedSpeechLangs,
      speechService.allowedTransLangs,
    );
  }, [speechService.allowedSpeechLangs, speechService.allowedTransLangs]);

  return (
    <div className="px-5">
      <label
        htmlFor="language"
        className="w-full text-sm font-medium text-Gray-800 ltr:text-left rtl:text-right mb-2 block"
      >
        {t('speech-services.subtitle-lang-label')}
      </label>
      <Listbox value={selectedSubtitleLang} onChange={setSelectedSubtitleLang}>
        <div className="relative w-full">
          <ListboxButton className="min-h-11 full rounded-2xl border border-Gray-300 bg-white shadow-input w-full px-3 pr-5 py-1 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm text-Gray-950">
            <span className="block truncate">
              {displayLangs
                .map((l) => (l.code === selectedSubtitleLang ? l.name : null))
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
              {displayLangs.map((l) => (
                <ListboxOption
                  key={l.code}
                  className={({ focus, selected }) =>
                    `relative cursor-default select-none py-2 px-3 rounded-[8px] truncate ${
                      focus ? 'bg-Blue2-50' : ''
                    } ${selected ? 'bg-Blue2-50' : ''}`
                  }
                  value={l.code}
                >
                  {({ selected }) => (
                    <>
                      <span className={`block`}>{l.name}</span>
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

export default SubtitleLangSelector;
