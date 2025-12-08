import React, { Dispatch, useMemo } from 'react';

import { getSubtitleLangs } from '../helpers/supportedLangs';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';

interface DefaultSubtitleLangSelectorProps {
  isServiceRunning: boolean;
  label: string;
  selectedSpeechLangs: string[];
  selectedTransLangs: string[];
  selectedDefaultSubtitleLang: string;
  setSelectedDefaultSubtitleLang: Dispatch<string>;
}
const DefaultSubtitleLangSelector = ({
  isServiceRunning,
  label,
  selectedSpeechLangs,
  selectedTransLangs,
  selectedDefaultSubtitleLang,
  setSelectedDefaultSubtitleLang,
}: DefaultSubtitleLangSelectorProps) => {
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
        label={label}
        value={selectedDefaultSubtitleLang}
        onChange={setSelectedDefaultSubtitleLang}
        options={dropdownOptions}
        disabled={isServiceRunning}
      />
    </div>
  );
};

export default DefaultSubtitleLangSelector;
