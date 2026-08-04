import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { InsightsTranscriptionFeatures } from 'plugnmeet-protocol-js';

import SettingsSwitch from '../../../helpers/ui/settingsSwitch';

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
      <div className="-mt-4 px-4 py-4 bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800">
        <SettingsSwitch
          label={t('speech-services.enable-speech-to-text')}
          enabled={enableSpeech}
          onChange={setEnableSpeech}
          disabled={isServiceActive}
          customCss="shadow-Icon-box h-11 border border-Gray-100 dark:border-Gray-800 rounded-2xl px-4 bg-white dark:bg-dark-primary"
        />
      </div>
      {enableSpeech && (
        <>
          <div className="grid gap-4 bg-white dark:bg-dark-primary py-4 px-4">
            <SettingsSwitch
              label={t('speech-services.allow-transcription-storage')}
              enabled={allowTranscriptionStorage}
              onChange={setAllowTranscriptionStorage}
              disabled={isServiceActive}
              customCss="shadow-Icon-box h-11 border border-Gray-100 dark:border-Gray-800 rounded-2xl px-4 bg-white dark:bg-dark-primary"
            />
          </div>
          <div className="grid gap-4 bg-white dark:bg-dark-primary py-4 px-6">
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
