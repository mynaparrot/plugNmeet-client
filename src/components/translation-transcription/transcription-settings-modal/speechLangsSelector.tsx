import React, { Dispatch, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';
import { supportedTranscriptionLangs } from '../helpers/supportedLangs';

interface SpeechLangsSelectorProps {
  selectedSpeechLangs: Array<string>;
  setSelectedSpeechLangs: Dispatch<Array<string>>;
}

const SpeechLangsSelector = ({
  selectedSpeechLangs,
  setSelectedSpeechLangs,
}: SpeechLangsSelectorProps) => {
  const { t } = useTranslation();
  const [selectOptions, setSelectOptions] = useState<ISelectOption[]>([]);

  useEffect(() => {
    supportedTranscriptionLangs().then((langs) => setSelectOptions(langs));
  }, []);

  return (
    <Dropdown
      id="speech-lang"
      label={t('speech-services.speech-langs-label')}
      value={selectedSpeechLangs}
      onChange={setSelectedSpeechLangs}
      multiple={true}
      options={selectOptions}
    />
  );
};

export default SpeechLangsSelector;
