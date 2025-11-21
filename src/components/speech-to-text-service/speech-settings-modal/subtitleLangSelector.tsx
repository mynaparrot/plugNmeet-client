import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { InsightsTranscriptionFeatures } from 'plugnmeet-protocol-js';

import { getSubtitleLangs } from '../helpers/supportedLangs';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';

interface ISubtitleLangSelectorProps {
  transcriptionFeatures: InsightsTranscriptionFeatures;
  selectedSubtitleLang: string;
  setSelectedSubtitleLang: React.Dispatch<string>;
}

const SubtitleLangSelector = ({
  transcriptionFeatures,
  selectedSubtitleLang,
  setSelectedSubtitleLang,
}: ISubtitleLangSelectorProps) => {
  const { t } = useTranslation();

  const dropdownOptions: ISelectOption[] = useMemo(() => {
    const langs = getSubtitleLangs(
      transcriptionFeatures.allowedSpokenLangs,
      transcriptionFeatures.allowedTransLangs,
    );
    return langs.map((l) => ({
      value: l.code,
      text: l.name,
    }));
  }, [
    transcriptionFeatures.allowedSpokenLangs,
    transcriptionFeatures.allowedTransLangs,
  ]);

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
