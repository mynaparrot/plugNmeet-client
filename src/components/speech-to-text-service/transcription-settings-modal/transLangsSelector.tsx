import React, { Dispatch, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';
import { supportedTranslationLangs } from '../helpers/supportedLangs';

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
  const [selectOptions, setSelectOptions] = useState<ISelectOption[]>([]);

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

  useEffect(() => {
    supportedTranslationLangs().then((langs) => setSelectOptions(langs));
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
      options={selectOptions}
    />
  );
};

export default TransLangsSelector;
