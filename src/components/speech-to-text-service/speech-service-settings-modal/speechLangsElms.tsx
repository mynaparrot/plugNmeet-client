import React, { Fragment, Dispatch } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';

import { supportedSpeechToTextLangs } from '../helpers/supportedLangs';
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';

interface SpeechLangsElmsProps {
  selectedSpeechLangs: Array<string>;
  setSelectedMicDevice: Dispatch<Array<string>>;
}

const SpeechLangsElms = ({
  selectedSpeechLangs,
  setSelectedMicDevice,
}: SpeechLangsElmsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <label
        htmlFor="language"
        className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right flex-1"
      >
        {t('speech-services.speech-langs-label')}
      </label>
      <Listbox
        value={selectedSpeechLangs}
        onChange={setSelectedMicDevice}
        multiple={true}
      >
        <div className="relative w-[190px]">
          <ListboxButton className="min-h-10 full rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 pr-5 py-1 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm text-Gray-950">
            <span className="block">
              {selectedSpeechLangs
                .map((l) => {
                  if (!l) return [];
                  return supportedSpeechToTextLangs.filter(
                    (lang) => lang.code === l,
                  )[0].name;
                })
                .join(', ')}
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
              {supportedSpeechToTextLangs.map((l) => (
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

export default SpeechLangsElms;
