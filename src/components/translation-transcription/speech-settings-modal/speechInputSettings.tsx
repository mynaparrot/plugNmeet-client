import React, { useEffect, useMemo } from 'react';
import { Field, Label, Switch } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { InsightsTranscriptionFeatures } from 'plugnmeet-protocol-js';

import { speechLangsMap } from '../helpers/supportedLangs';
import Dropdown from '../../../helpers/ui/dropdown';

interface ISpeechInputSettingsProps {
  transcriptionFeatures: InsightsTranscriptionFeatures;
  isServiceActive: boolean;
  enableSpeech: boolean;
  setEnableSpeech: React.Dispatch<React.SetStateAction<boolean>>;
  allowTranscriptionStorage: boolean;
  setAllowTranscriptionStorage: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSpeechLang: string;
  setSelectedSpeechLang: React.Dispatch<string>;
}

const SpeechInputSettings = ({
  transcriptionFeatures,
  isServiceActive,
  enableSpeech,
  setEnableSpeech,
  allowTranscriptionStorage,
  setAllowTranscriptionStorage,
  selectedSpeechLang,
  setSelectedSpeechLang,
}: ISpeechInputSettingsProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!enableSpeech) {
      setSelectedSpeechLang('');
    }
  }, [enableSpeech, setSelectedSpeechLang]);

  const speechLangOptions = useMemo(() => {
    return (
      transcriptionFeatures.allowedSpokenLangs?.map((l) => {
        return { value: l, text: speechLangsMap.get(l)?.name ?? l };
      }) ?? []
    );
  }, [transcriptionFeatures.allowedSpokenLangs]);

  return (
    <>
      <Field className="-mt-4 px-4 py-4 bg-Gray-25 border-y border-dotted border-Gray-100">
        <div className="flex items-center cursor-pointer justify-between shadow-Icon-box h-11 border border-Gray-100 rounded-2xl px-4 bg-white">
          <Label className="pr-4 w-full text-sm text-Gray-800 font-medium cursor-pointer">
            {t('speech-services.enable-speech-to-text')}
          </Label>
          <Switch
            checked={enableSpeech}
            onChange={setEnableSpeech}
            disabled={isServiceActive}
            className={`${
              enableSpeech ? 'bg-Blue2-500' : 'bg-Gray-200'
            } relative outline-none inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden cursor-pointer`}
          >
            <span
              className={`${
                enableSpeech
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:-translate-x-0.5'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>
      </Field>
      {enableSpeech && (
        <>
          <Field className="grid gap-4 bg-white py-4 px-4">
            <div className="flex items-center cursor-pointer justify-between shadow-Icon-box h-11 border border-Gray-100 rounded-2xl px-4 bg-white">
              <Label className="pr-4 w-full text-sm text-Gray-800 font-medium cursor-pointer">
                {t('speech-services.allow-transcription-storage')}
              </Label>
              <Switch
                checked={allowTranscriptionStorage}
                onChange={setAllowTranscriptionStorage}
                disabled={isServiceActive}
                className={`${
                  allowTranscriptionStorage ? 'bg-Blue2-500' : 'bg-Gray-200'
                } relative outline-none inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden cursor-pointer`}
              >
                <span
                  className={`${
                    allowTranscriptionStorage
                      ? 'ltr:translate-x-5 rtl:-translate-x-5'
                      : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                  } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
                />
              </Switch>
            </div>
          </Field>
          <div className="grid gap-4 bg-white py-4 px-6">
            <Dropdown
              id="speech-lang"
              value={selectedSpeechLang}
              onChange={setSelectedSpeechLang}
              options={speechLangOptions}
              label={t('speech-services.speech-lang-label')}
              direction="vertical"
              disabled={isServiceActive}
            />
          </div>
        </>
      )}
    </>
  );
};

export default SpeechInputSettings;
