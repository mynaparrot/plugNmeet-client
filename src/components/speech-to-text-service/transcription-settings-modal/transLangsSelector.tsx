import React, { Dispatch, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { supportedTranslationLangs } from '../helpers/supportedLangs';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';

interface TransLangsSelectorProps {
  selectedTransLangs: Array<string>;
  setSelectedTransLangs: Dispatch<Array<string>>;
  maxLangsAllowSelecting: number;
}

const TransLangsSelector = ({
  selectedTransLangs,
  setSelectedTransLangs,
  maxLangsAllowSelecting,
}: TransLangsSelectorProps) => {
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] =
    useState<string[]>(selectedTransLangs);

  useEffect(() => {
    if (selectedItems.length > maxLangsAllowSelecting) {
      toast.warn(
        t('speech-services.max-lang-selection-warning', {
          num: maxLangsAllowSelecting,
        }),
        {
          toastId: 'max-lang-selection-warning',
        },
      );
      return;
    }
    setSelectedTransLangs(selectedItems);
  }, [selectedItems, maxLangsAllowSelecting, setSelectedTransLangs, t]);

  const transLangOptions: ISelectOption[] = useMemo(() => {
    return supportedTranslationLangs.map((l) => ({
      value: l.code,
      text: l.name,
    }));
  }, []);

  return (
    <Dropdown
      id="trans-lang"
      label={t('speech-services.translation-langs-label', {
        num: maxLangsAllowSelecting,
      })}
      value={selectedTransLangs}
      onChange={setSelectedItems}
      multiple={true}
      options={transLangOptions}
    />
  );
};

export default TransLangsSelector;
