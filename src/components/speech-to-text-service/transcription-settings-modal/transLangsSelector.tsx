import React, { Dispatch, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { supportedTranslationLangs } from '../helpers/supportedLangs';
import { store } from '../../../store';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';

interface TransLangsSelectorProps {
  selectedTransLangs: Array<string>;
  setSelectedTransLangs: Dispatch<Array<string>>;
}

const TransLangsSelector = ({
  selectedTransLangs,
  setSelectedTransLangs,
}: TransLangsSelectorProps) => {
  const { t } = useTranslation();
  const max =
    store.getState().session.currentRoom.metadata?.roomFeatures
      ?.speechToTextTranslationFeatures?.maxNumTranLangsAllowSelecting || 2;

  const [selectedItems, setSelectedItems] =
    useState<string[]>(selectedTransLangs);

  useEffect(() => {
    if (selectedItems.length > max) {
      toast.warn(
        t('speech-services.max-lang-selection-warning', { num: max }),
        {
          toastId: 'max-lang-selection-warning',
        },
      );
      return;
    }
    setSelectedTransLangs(selectedItems);
    // oxlint-disable-next-line exhaustive-deps
  }, [selectedItems]);

  const transLangOptions: ISelectOption[] = useMemo(() => {
    return supportedTranslationLangs.map((l) => ({
      value: l.code,
      text: l.name,
    }));
  }, []);

  return (
    <Dropdown
      id="trans-lang"
      label={t('speech-services.translation-langs-label', { num: max })}
      value={selectedTransLangs}
      onChange={setSelectedItems}
      multiple={true}
      options={transLangOptions}
    />
  );
};

export default TransLangsSelector;
