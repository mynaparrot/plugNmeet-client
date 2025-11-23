import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { InsightsChatTranslationConfigReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import TransLangsSelector from '../transcription-settings/transLangsSelector';
import { useAppDispatch, useAppSelector } from '../../../store';
import DefaultSubtitleLangSelector from '../transcription-settings/defaultSubtitleLangSelector';
import {
  enableOrUpdateChatTranslation,
  endChatTranslation,
} from '../helpers/apiConnections';
import { updateDisplaySpeechSettingsModal } from '../../../store/slices/bottomIconsActivitySlice';

interface ChatTranslationSettingsProps {
  setErrorMsg: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const ChatTranslationSettings = ({
  setErrorMsg,
}: ChatTranslationSettingsProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

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

  const enableOrUpdateService = useCallback(async () => {
    setErrorMsg(undefined);

    const body = create(InsightsChatTranslationConfigReqSchema, {
      allowedTransLangs: selectedTransLangs,
      defaultLang: selectedDefaultLang,
    });

    const res = await enableOrUpdateChatTranslation(body);
    if (res.status) {
      toast(t('speech-services.service-started'), {
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
      setErrorMsg(t(res.msg));
      return;
    }
    dispatch(updateDisplaySpeechSettingsModal(false));
    // oxlint-disable-next-line exhaustive-deps
  }, [setErrorMsg, selectedTransLangs, selectedDefaultLang]);

  const stopService = useCallback(async () => {
    const res = await endChatTranslation();
    if (res.status) {
      toast(t('speech-services.service-ended'), {
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
      setErrorMsg(t(res.msg));
      return;
    }
    dispatch(updateDisplaySpeechSettingsModal(false));
    // oxlint-disable-next-line exhaustive-deps
  }, []);

  return (
    <>
      <div className="p-4 bg-Gray-2">
        <div className="main-wrap -my-4">
          <div className="grid">
            <div className="grid gap-4 py-4 bg-white">
              <TransLangsSelector
                label={t('speech-services.read-and-write-in-label', {
                  num: chatTranslationFeatures?.maxSelectedTransLangs ?? 2,
                })}
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
