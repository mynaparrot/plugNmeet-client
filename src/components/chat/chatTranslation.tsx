import React, { useEffect, useState } from 'react';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react';

import { CheckMarkIcon } from '../../assets/Icons/CheckMarkIcon';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  supportedTranscriptionLangs,
  supportedTranslationLangs,
  translationLangsMap,
} from '../translation-transcription/helpers/supportedLangs';
import { updateSelectedChatTransLang } from '../../store/slices/roomSettingsSlice';

interface LanguageInfo {
  title: string;
  code: string;
}

const ChatTranslation = () => {
  const dispatch = useAppDispatch();
  const chatTranslationFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.chatTranslationFeatures,
  );

  const [selectedLanguage, setSelectedLanguage] = useState<
    LanguageInfo | undefined
  >();
  const [transLangs, setTransLangs] = useState<LanguageInfo[]>([]);

  useEffect(() => {
    if (!chatTranslationFeatures?.isEnabled) {
      setSelectedLanguage(undefined);
      return;
    }

    Promise.allSettled([
      supportedTranscriptionLangs(),
      supportedTranslationLangs(),
    ]).then(() => {
      const allLangs: LanguageInfo[] =
        chatTranslationFeatures.allowedTransLangs.map((lang) => ({
          title: translationLangsMap.get(lang)?.name ?? lang,
          code: lang,
        }));
      setTransLangs(allLangs);

      if (chatTranslationFeatures.defaultLang) {
        const defaultLangObject = allLangs.find(
          (l) => l.code === chatTranslationFeatures.defaultLang,
        );
        setSelectedLanguage(defaultLangObject);
      }
    });
  }, [chatTranslationFeatures]);

  useEffect(() => {
    dispatch(updateSelectedChatTransLang(selectedLanguage?.code ?? ''));
  }, [dispatch, selectedLanguage]);

  return (
    chatTranslationFeatures?.isEnabled &&
    transLangs.length && (
      <Listbox value={selectedLanguage} onChange={setSelectedLanguage}>
        <ListboxButton className="lang h-6 3xl:h-8 w-9 3xl:w-[43px] flex items-center justify-center cursor-pointer border border-Gray-300 rounded-md 3xl:rounded-[11px] text-xs 3xl:text-sm font-medium 3xl:font-semibold text-Gray-950">
          {selectedLanguage?.code.toLocaleUpperCase()}
        </ListboxButton>
        <ListboxOptions
          anchor="bottom"
          transition
          className="border border-gray-200 rounded-xl shadow-dropdown-menu bg-white overflow-hidden w-40 py-1.5 z-20"
        >
          {transLangs.map((lang) => (
            <ListboxOption key={lang.code} value={lang}>
              {({ selected }) => (
                <div className="text-sm cursor-pointer text-Gray-950 hover:bg-Gray-50 flex items-center justify-between px-3 3xl:px-4 py-2">
                  <span>{lang.title}</span>{' '}
                  {selected && (
                    <span>
                      <CheckMarkIcon />
                    </span>
                  )}
                </div>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    )
  );
};

export default ChatTranslation;
