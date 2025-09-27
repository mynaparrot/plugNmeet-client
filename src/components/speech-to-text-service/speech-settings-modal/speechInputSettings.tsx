import React, { Fragment, useEffect, useState } from 'react';
import {
  Field,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Switch,
  Transition,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import { SpeechToTextTranslationFeatures } from 'plugnmeet-protocol-js';

import { supportedSpeechToTextLangs } from '../helpers/supportedLangs';
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';
import MicSelector from './micSelector';

interface ISpeechInputSettingsProps {
  speechService: SpeechToTextTranslationFeatures;
  recognizer: SpeechRecognizer | TranslationRecognizer | undefined;
  selectedSpeechLang: string;
  setSelectedSpeechLang: React.Dispatch<string>;
  selectedMicDevice: string;
  setSelectedMicDevice: React.Dispatch<string>;
}

const SpeechInputSettings = ({
  speechService,
  recognizer,
  selectedSpeechLang,
  setSelectedSpeechLang,
  selectedMicDevice,
  setSelectedMicDevice,
}: ISpeechInputSettingsProps) => {
  const { t } = useTranslation();
  const [enableSpeechToText, setEnableSpeechToText] = useState<boolean>(true);

  useEffect(() => {
    if (!enableSpeechToText) {
      setSelectedMicDevice('');
      setSelectedSpeechLang('');
    }
    //eslint-disable-next-line
  }, [enableSpeechToText]);

  const speechLangElms = () => {
    return (
      <>
        <div className="">
          <label
            htmlFor="speech-lang"
            className="w-full text-sm font-medium text-Gray-800 ltr:text-left rtl:text-right mb-2 block"
          >
            {t('speech-services.speech-lang-label')}
          </label>
          <Listbox
            value={selectedSpeechLang}
            onChange={setSelectedSpeechLang}
            disabled={recognizer !== undefined}
          >
            <div className="relative w-full">
              <ListboxButton
                className={`min-h-11 full rounded-2xl border border-Gray-300 bg-white shadow-input w-full px-3 pr-5 py-1 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm text-Gray-950 ${
                  recognizer !== undefined ? 'opacity-70' : ''
                }`}
              >
                <span className="block truncate">
                  {supportedSpeechToTextLangs
                    .map((l) => (l.code === selectedSpeechLang ? l.name : null))
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
                  {speechService.allowedSpeechLangs?.map((l) => (
                    <ListboxOption
                      key={l}
                      className={({ focus, selected }) =>
                        `relative cursor-default select-none py-2 px-3 rounded-[8px] truncate ${
                          focus ? 'bg-Blue2-50' : ''
                        } ${selected ? 'bg-Blue2-50' : ''}`
                      }
                      value={l}
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block`}>
                            {
                              supportedSpeechToTextLangs.find(
                                (lang) => lang.code === l,
                              )?.name
                            }
                          </span>
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

        <MicSelector
          disabled={recognizer !== undefined}
          selectedMicDevice={selectedMicDevice}
          setSelectedMicDevice={setSelectedMicDevice}
        />
      </>
    );
  };

  return (
    <>
      <Field className="py-4 px-5 bg-Gray-25 border-y border-dotted border-Gray-100">
        <div className="flex items-center cursor-pointer justify-between shadow-Icon-box h-11 border border-Gray-100 rounded-2xl px-4 bg-white">
          <Label className="pr-4 w-full text-sm text-Gray-800 font-medium cursor-pointer">
            {t('speech-services.enable-speech-to-text')}
          </Label>
          <Switch
            checked={enableSpeechToText}
            onChange={setEnableSpeechToText}
            disabled={recognizer !== undefined}
            className={`${
              enableSpeechToText ? 'bg-Blue2-500' : 'bg-Gray-200'
            } relative outline-none inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden cursor-pointer`}
          >
            <span
              className={`${
                enableSpeechToText
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:-translate-x-0.5'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>
      </Field>
      {enableSpeechToText && (
        <div className="px-5 grid gap-4">{speechLangElms()}</div>
      )}
    </>
  );
};

export default SpeechInputSettings;
