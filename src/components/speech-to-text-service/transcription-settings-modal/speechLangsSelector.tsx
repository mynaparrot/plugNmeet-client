import React, { Dispatch, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { supportedSpeechToTextLangs } from '../helpers/supportedLangs';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';

interface SpeechLangsSelectorProps {
  selectedSpeechLangs: Array<string>;
  setSelectedSpeechLangs: Dispatch<Array<string>>;
}

const SpeechLangsSelector = ({
  selectedSpeechLangs,
  setSelectedSpeechLangs,
}: SpeechLangsSelectorProps) => {
  const { t } = useTranslation();

  const speechLangOptions: ISelectOption[] = useMemo(() => {
    return supportedSpeechToTextLangs.map((l) => ({
      value: l.code,
      text: l.name,
    }));
  }, []);

  return (
    <Dropdown
      id="speech-lang"
      label={t('speech-services.speech-langs-label')}
      value={selectedSpeechLangs}
      onChange={setSelectedSpeechLangs}
      multiple={true}
      options={speechLangOptions}
    />
  );
};

export default SpeechLangsSelector;
