import React, { Fragment, Dispatch } from 'react';
import { useTranslation } from 'react-i18next';
import { Listbox, Transition } from '@headlessui/react';

import { supportedSpeechToTextLangs } from '../helpers/supportedLangs';

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
        className="pr-4 w-auto dark:text-darkText text-sm"
      >
        {t('speech-services.speech-langs-label')}
      </label>
      <Listbox
        value={selectedSpeechLangs}
        onChange={setSelectedMicDevice}
        multiple={true}
      >
        <div className="relative mt-1 w-[150px] sm:w-[250px]">
          <Listbox.Button className="relative min-h-[36px] w-full cursor-default py-1 pl-3 pr-7 text-left border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm">
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
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 ">
              <i className="pnm-updown text-xl primaryColor dark:text-darkText" />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto scrollBar scrollBar4 rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {supportedSpeechToTextLangs.map((l) => (
                <Listbox.Option
                  key={l.code}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pr-4 pl-7 ${
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
                          <i className="pnm-check w-4 h-4" />
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

export default SpeechLangsElms;
