import React, { Dispatch, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getSubtitleLangs } from '../helpers/supportedLangs';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';

interface DefaultSubtitleLangSelectorProps {
  selectedSpeechLangs: string[];
  selectedTransLangs: string[];
  selectedDefaultSubtitleLang: string;
  setSelectedDefaultSubtitleLang: Dispatch<string>;
}
const DefaultSubtitleLangSelector = ({
  selectedSpeechLangs,
  selectedTransLangs,
  selectedDefaultSubtitleLang,
  setSelectedDefaultSubtitleLang,
}: DefaultSubtitleLangSelectorProps) => {
  const { t } = useTranslation();

  const dropdownOptions: ISelectOption[] = useMemo(() => {
    const langs = getSubtitleLangs(selectedSpeechLangs, selectedTransLangs);
    return langs.map((l) => ({
      value: l.code,
      text: l.name,
    }));
  }, [selectedSpeechLangs, selectedTransLangs]);

  return (
    <div className="">
      <Dropdown
        id="default-subtitle-lang"
        label={t('speech-services.default-subtitle-lang-label')}
        value={selectedDefaultSubtitleLang}
        onChange={setSelectedDefaultSubtitleLang}
        options={dropdownOptions}
      />
    </div>
  );
};

export default DefaultSubtitleLangSelector;
