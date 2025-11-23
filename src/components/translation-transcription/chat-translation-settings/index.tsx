import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import TransLangsSelector from '../transcription-settings/transLangsSelector';
import { useAppSelector } from '../../../store';
import DefaultSubtitleLangSelector from '../transcription-settings/defaultSubtitleLangSelector';

interface ChatTranslationSettingsProps {
  setErrorMsg: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const ChatTranslationSettings = ({
  setErrorMsg,
}: ChatTranslationSettingsProps) => {
  const { t } = useTranslation();
  const chatTranslationFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.chatTranslationFeatures,
  );

  const [selectedTransLangs, setSelectedTransLangs] = useState<string[]>(
    chatTranslationFeatures?.allowedTransLangs ?? [],
  );
  const [selectedDefaultLang, setSelectedDefaultLang] = useState<string>(
    chatTranslationFeatures?.defaultLang ?? '',
  );

  const enableOrUpdateService = useCallback(() => {
    console.log(selectedTransLangs);
  }, [selectedTransLangs]);

  const stopService = useCallback(() => {}, []);

  return (
    <>
      <div className="p-4 bg-Gray-2">
        <div className="main-wrap -my-4">
          <div className="grid">
            <div className="grid gap-4 py-4 bg-white">
              <TransLangsSelector
                selectedTransLangs={selectedTransLangs}
                setSelectedTransLangs={setSelectedTransLangs}
                setErrorMsg={setErrorMsg}
                maxLangsAllowSelecting={
                  chatTranslationFeatures?.maxSelectedTransLangs ?? 2
                }
              />
              <DefaultSubtitleLangSelector
                label={t('speech-services.default-lang-label')}
                selectedSpeechLangs={[]}
                selectedTransLangs={selectedTransLangs}
                selectedDefaultSubtitleLang={selectedDefaultLang}
                setSelectedDefaultSubtitleLang={setSelectedDefaultLang}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 py-4 border-t border-Gray-100 flex justify-end items-center gap-4 rounded-b-xl">
        {!chatTranslationFeatures?.isEnabled && (
          <button
            className="h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
            onClick={() => enableOrUpdateService()}
          >
            {t('speech-services.enable-service')}
          </button>
        )}
        {chatTranslationFeatures?.isEnabled && (
          <>
            <button
              className="h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-white hover:bg-Red-600 border border-Gray-300 rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow"
              onClick={() => stopService()}
            >
              {t('speech-services.stop-service')}
            </button>
            <button
              className="h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
              onClick={() => enableOrUpdateService()}
            >
              {t('speech-services.update-service')}
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default ChatTranslationSettings;
