import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SpeechToTextTranslationFeatures } from 'plugnmeet-protocol-js';

import { getSubtitleLangs } from '../helpers/supportedLangs';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';

interface ISubtitleLangSelectorProps {
  speechService: SpeechToTextTranslationFeatures;
  selectedSubtitleLang: string;
  setSelectedSubtitleLang: React.Dispatch<string>;
}

const SubtitleLangSelector = ({
  speechService,
  selectedSubtitleLang,
  setSelectedSubtitleLang,
}: ISubtitleLangSelectorProps) => {
  const { t } = useTranslation();

  const dropdownOptions: ISelectOption[] = useMemo(() => {
    const langs = getSubtitleLangs(
      speechService.allowedSpeechLangs,
      speechService.allowedTransLangs,
    );
    return langs.map((l) => ({
      value: l.code,
      text: l.name,
    }));
  }, [speechService.allowedSpeechLangs, speechService.allowedTransLangs]);

  return (
    <div className="px-5 pt-4 pb-4">
      <Dropdown
        id="language"
        label={t('speech-services.subtitle-lang-label')}
        value={selectedSubtitleLang}
        onChange={setSelectedSubtitleLang}
        options={dropdownOptions}
        direction="vertical"
      />
    </div>
  );
};

export default SubtitleLangSelector;
