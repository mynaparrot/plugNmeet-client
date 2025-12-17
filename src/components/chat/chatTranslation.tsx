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
        <ListboxButton className="lang h-6 w-9 flex items-center justify-center cursor-pointer border border-Gray-300 dark:border-Gray-800 rounded-md 3xl:rounded-[11px] text-xs font-medium text-Gray-950 dark:text-white">
          {selectedLanguage?.code.toLocaleUpperCase()}
        </ListboxButton>
        <ListboxOptions
          anchor="bottom"
          transition
          className="border border-gray-200 dark:border-gray-800 rounded-xl shadow-dropdown-menu bg-white dark:bg-dark-primary overflow-hidden w-40 py-1.5 z-20 px-1"
        >
          {transLangs.map((lang) => (
            <ListboxOption key={lang.code} value={lang}>
              {({ selected }) => (
                <div className="text-sm cursor-pointer text-Gray-950 dark:text-white hover:bg-Gray-50 hover:dark:bg-dark-secondary2 flex items-center justify-between px-3 py-1.5 rounded-lg">
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
