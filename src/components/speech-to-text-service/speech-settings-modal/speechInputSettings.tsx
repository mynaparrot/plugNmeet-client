import React, { useEffect, useMemo, useState } from 'react';
import { Field, Label, Switch } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { InsightsTranscriptionFeatures } from 'plugnmeet-protocol-js';

import { speechLangsMap } from '../helpers/supportedLangs';
import Dropdown from '../../../helpers/ui/dropdown';

interface ISpeechInputSettingsProps {
  transcriptionFeatures: InsightsTranscriptionFeatures;
  selectedSpeechLang: string;
  setSelectedSpeechLang: React.Dispatch<string>;
}

const SpeechInputSettings = ({
  transcriptionFeatures,
  selectedSpeechLang,
  setSelectedSpeechLang,
}: ISpeechInputSettingsProps) => {
  const { t } = useTranslation();
  const [enableSpeechToText, setEnableSpeechToText] = useState<boolean>(true);

  useEffect(() => {
    if (!enableSpeechToText) {
      setSelectedSpeechLang('');
    }
  }, [enableSpeechToText, setSelectedSpeechLang]);

  const speechLangOptions = useMemo(() => {
    return (
      transcriptionFeatures.allowedSpokenLangs?.map((l) => {
        return { value: l, text: speechLangsMap.get(l)?.name ?? l };
      }) ?? []
    );
  }, [transcriptionFeatures.allowedSpokenLangs]);

  const speechLangElms = () => {
    return (
      <>
        <Dropdown
          id="speech-lang"
          value={selectedSpeechLang}
          onChange={setSelectedSpeechLang}
          options={speechLangOptions}
          label={t('speech-services.speech-lang-label')}
          direction="vertical"
        />
      </>
    );
  };

  return (
    <>
      <Field className="-mt-4 px-4 py-4 bg-Gray-25 border-y border-dotted border-Gray-100">
        <div className="flex items-center cursor-pointer justify-between shadow-Icon-box h-11 border border-Gray-100 rounded-2xl px-4 bg-white">
          <Label className="pr-4 w-full text-sm text-Gray-800 font-medium cursor-pointer">
            {t('speech-services.enable-speech-to-text')}
          </Label>
          <Switch
            checked={enableSpeechToText}
            onChange={setEnableSpeechToText}
            //disabled={recognizer !== undefined}
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
        <div className="grid gap-4 bg-white py-4 px-4">{speechLangElms()}</div>
      )}
    </>
  );
};

export default SpeechInputSettings;
