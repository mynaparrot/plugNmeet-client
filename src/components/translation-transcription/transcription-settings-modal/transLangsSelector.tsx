import React, { Dispatch, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';
import { supportedTranslationLangs } from '../helpers/supportedLangs';

interface TransLangsSelectorProps {
  selectedTransLangs: Array<string>;
  setSelectedTransLangs: Dispatch<Array<string>>;
  setErrorMsg: Dispatch<string | undefined>;
  maxLangsAllowSelecting: number;
}

const TransLangsSelector = ({
  selectedTransLangs,
  setSelectedTransLangs,
  setErrorMsg,
  maxLangsAllowSelecting,
}: TransLangsSelectorProps) => {
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] =
    useState<string[]>(selectedTransLangs);
  const [selectOptions, setSelectOptions] = useState<ISelectOption[]>([]);

  useEffect(() => {
    if (selectedItems.length > maxLangsAllowSelecting) {
      const msg = t('speech-services.max-lang-selection-warning', {
        num: maxLangsAllowSelecting,
      });

      toast.warn(msg, {
        toastId: 'max-lang-selection-warning',
      });
      setErrorMsg(msg);
      return;
    }
    setSelectedTransLangs(selectedItems);
  }, [
    setErrorMsg,
    selectedItems,
    maxLangsAllowSelecting,
    setSelectedTransLangs,
    t,
  ]);

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
