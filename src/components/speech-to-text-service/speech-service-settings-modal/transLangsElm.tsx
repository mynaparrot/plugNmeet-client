import React, { Dispatch, Fragment, useEffect, useState } from 'react';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { supportedTranslationLangs } from '../helpers/supportedLangs';
import { store } from '../../../store';
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';

interface TransLangsElmPros {
  selectedTransLangs: Array<string>;
  setSelectedTransLangs: Dispatch<Array<string>>;
}

const TransLangsElm = ({
  selectedTransLangs,
  setSelectedTransLangs,
}: TransLangsElmPros) => {
  const { t } = useTranslation();
  const max =
    store.getState().session.currentRoom.metadata?.roomFeatures
      ?.speechToTextTranslationFeatures?.maxNumTranLangsAllowSelecting || 2;

  const [selectedItems, setSelectedItems] =
    useState<string[]>(selectedTransLangs);

  useEffect(() => {
    if (selectedItems.length > max) {
      return;
    }
    setSelectedTransLangs(selectedItems);
    //eslint-disable-next-line
  }, [selectedItems]);

  return (
    <div className="flex items-center justify-between mb-2">
      <label
        htmlFor="language"
        className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right flex-1"
      >
        {t('speech-services.translation-langs-label', { num: max })}
      </label>
      <Listbox
        value={selectedTransLangs}
        onChange={setSelectedItems}
        multiple={true}
      >
        <div className="relative w-[190px]">
          <ListboxButton className="min-h-10 full rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 pr-5 py-1 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm text-Gray-950">
            <span className="block">
              {selectedTransLangs
                .map((l) => {
                  if (!l) return [];
                  return supportedTranslationLangs.filter(
                    (lang) => lang.code === l,
                  )[0].name;
                })
                .join(', ')}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
              <DropdownIconSVG />
            </span>
          </ListboxButton>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdown-menu border border-Gray-100 focus:outline-hidden scrollBar scrollBar2 grid gap-0.5">
              {supportedTranslationLangs.map((l) => (
                <ListboxOption
                  key={`trans_${l.code}`}
                  className={({ focus, selected }) =>
                    `relative cursor-default select-none py-2 px-3 rounded-[8px] truncate ${
                      focus ? 'bg-Blue2-50' : ''
                    } ${selected ? 'bg-Blue2-50' : ''}`
                  }
                  value={l.code}
                >
                  {({ selected }) => (
                    <>
                      <span className={`block`}>{l.name}</span>
                      {selected ? (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                          <CheckMarkIcon />
                        </span>
                      ) : null}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default TransLangsElm;
