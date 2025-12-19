import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { InsightsTranscriptionConfigReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { updateDisplaySpeechSettingsModal } from '../../../store/slices/bottomIconsActivitySlice';
import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  enableOrUpdateTranscription,
  endTranscription,
} from '../helpers/apiConnections';
import { validateSettings } from '../helpers/modalUtils';
import SpeechLangsSelector from './speechLangsSelector';
import SpeechUsersSelector from './speechUsersSelector';
import TransLangsSelector from './transLangsSelector';
import DefaultSubtitleLangSelector from './defaultSubtitleLangSelector';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';
import { speechLangsMap } from '../helpers/supportedLangs';

interface TranscriptionSettingsProps {
  setErrorMsg: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const TranscriptionSettings = ({ setErrorMsg }: TranscriptionSettingsProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  // all static values
  const { enabledSelfInsertEncryptionKey } = useMemo(() => {
    const enabledSelfInsertEncryptionKey =
      !!store.getState().session.currentRoom.metadata?.roomFeatures
        ?.endToEndEncryptionFeatures?.enabledSelfInsertEncryptionKey;
    return { enabledSelfInsertEncryptionKey };
  }, []);

  const transcriptionFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.transcriptionFeatures,
  );
  const [enabledTranscription, setEnabledTranscription] = useState<boolean>(
    !!transcriptionFeatures?.isEnabled,
  );
  const [enabledTransSynthesis, setEnabledTransSynthesis] = useState<boolean>(
    !!transcriptionFeatures?.isEnabledSpeechSynthesis,
  );

  const [selectedSpeechLangs, setSelectedSpeechLangs] = useState<string[]>(
    transcriptionFeatures?.allowedSpokenLangs ?? [],
  );
  const [selectedSpeechUsers, setSelectedSpeechUsers] = useState<string[]>(
    transcriptionFeatures?.allowedSpeechUsers ?? [],
  );

  const [enableTranslation, setEnableTranslation] = useState<boolean>(
    !!transcriptionFeatures?.isEnabledTranslation,
  );
  const [selectedTransLangs, setSelectedTransLangs] = useState<string[]>(
    transcriptionFeatures?.allowedTransLangs ?? [],
  );
  const [selectedDefaultSubtitleLang, setSelectedDefaultSubtitleLang] =
    useState<string>(transcriptionFeatures?.defaultSubtitleLang ?? '');

  const enableOrUpdateService = useCallback(async () => {
    const validation = validateSettings({
      selectedSpeechUsers,
      selectedSpeechLangs,
      enableTranslation,
      selectedTransLangs,
      enabledTransSynthesis,
    });
    if (!validation.isValid) {
      setErrorMsg(t(validation.message!));
      return;
    }
    setErrorMsg(undefined);

    const body = create(InsightsTranscriptionConfigReqSchema, {
      isEnabled: true,
      allowedSpokenLangs: selectedSpeechLangs,
      allowedSpeechUsers: selectedSpeechUsers,
      isEnabledTranslation: enableTranslation,
      allowedTransLangs: selectedTransLangs,
      defaultSubtitleLang: selectedDefaultSubtitleLang,
      isEnabledSpeechSynthesis: enabledTransSynthesis,
    });

    if (selectedDefaultSubtitleLang === '') {
      const lang = body.allowedSpokenLangs[0];
      body.defaultSubtitleLang = speechLangsMap.get(lang)?.locale ?? '';
    }

    const res = await enableOrUpdateTranscription(body);
    if (res.status) {
      toast(t('speech-services.service-ready'), {
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
  }, [
    selectedSpeechUsers,
    selectedSpeechLangs,
    enableTranslation,
    enabledTransSynthesis,
    selectedTransLangs,
    selectedDefaultSubtitleLang,
  ]);

  const stopService = async () => {
    const res = await endTranscription();

    if (res.status) {
      toast(t('speech-services.service-stopped'), {
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
  };

  // This effect will clear the validation error as soon as the user
  // starts changing the settings, providing a better user experience.
  useEffect(() => {
    setErrorMsg(undefined);
    //eslint-disable-next-line
  }, [
    selectedSpeechLangs,
    selectedSpeechUsers,
    enableTranslation,
    selectedTransLangs,
  ]);

  const renderContent = () => (
    <div className="main-wrap -my-4">
      <div className="grid">
        <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-4 py-4">
          <SettingsSwitch
            label={t('speech-services.enable-transcription')}
            enabled={enabledTranscription}
            onChange={setEnabledTranscription}
            customCss="shadow-Icon-box h-11 border border-Gray-100 dark:border-Gray-800 rounded-2xl px-4 bg-white dark:bg-dark-primary"
          />
        </div>
        {enabledTranscription && (
          <div className="grid gap-4 py-4 bg-white dark:bg-dark-primary">
            <SpeechLangsSelector
              isServiceRunning={!!transcriptionFeatures?.isEnabled}
              selectedSpeechLangs={selectedSpeechLangs}
              setSelectedSpeechLangs={setSelectedSpeechLangs}
            />
            <SpeechUsersSelector
              selectedSpeechUsers={selectedSpeechUsers}
              setSelectedSpeechUsers={setSelectedSpeechUsers}
            />
            <DefaultSubtitleLangSelector
              isServiceRunning={!!transcriptionFeatures?.isEnabled}
              label={t('speech-services.default-subtitle-lang-label')}
              selectedSpeechLangs={selectedSpeechLangs}
              selectedTransLangs={selectedTransLangs}
              selectedDefaultSubtitleLang={selectedDefaultSubtitleLang}
              setSelectedDefaultSubtitleLang={setSelectedDefaultSubtitleLang}
            />
          </div>
        )}
        {enabledTranscription && (
          <>
            <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-4 py-4">
              <SettingsSwitch
                label={t('speech-services.enable-translation')}
                enabled={enableTranslation}
                onChange={setEnableTranslation}
                customCss="shadow-Icon-box h-11 border border-Gray-100 dark:border-Gray-800 rounded-2xl px-4 bg-white dark:bg-dark-primary"
                disabled={transcriptionFeatures?.isEnabled}
              />
            </div>
            {enableTranslation && (
              <>
                <div className="grid gap-4 py-4 bg-white dark:bg-dark-primary">
                  <TransLangsSelector
                    isServiceRunning={!!transcriptionFeatures?.isEnabled}
                    label={t('speech-services.translation-langs-label', {
                      num: transcriptionFeatures?.maxSelectedTransLangs ?? 2,
                    })}
                    selectedTransLangs={selectedTransLangs}
                    setSelectedTransLangs={setSelectedTransLangs}
                    setErrorMsg={setErrorMsg}
                    maxLangsAllowSelecting={
                      transcriptionFeatures?.maxSelectedTransLangs ?? 2
                    }
                  />
                </div>
                {transcriptionFeatures?.isAllowSpeechSynthesis &&
                  selectedTransLangs.length > 0 && (
                    <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-4 py-4">
                      <SettingsSwitch
                        label={t('speech-services.enable-trans-synthesis')}
                        enabled={enabledTransSynthesis}
                        onChange={setEnabledTransSynthesis}
                        disabled={transcriptionFeatures?.isEnabled}
                        customCss="shadow-Icon-box h-11 border border-Gray-100 dark:border-Gray-800 rounded-2xl px-4 bg-white dark:bg-dark-primary"
                      />
                    </div>
                  )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (enabledSelfInsertEncryptionKey) {
    return (
      <div className="p-4 bg-Gray-2">
        <div className="main-wrap -my-4 text-red-600">
          {t('insights.feature-disable-while-e2ee-self-key-enabled')}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 bg-Gray-2">{renderContent()}</div>
      <div className="px-4 py-4 border-t border-Gray-100 dark:border-Gray-800 flex justify-end items-center gap-4 rounded-b-xl">
        {!transcriptionFeatures?.isEnabled && (
          <button
            className="primary-button h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
            onClick={() => enableOrUpdateService()}
          >
            {t('speech-services.enable-service')}
          </button>
        )}
        {transcriptionFeatures?.isEnabled && (
          <>
            <button
              className="secondary-button h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-white hover:bg-Red-600 border border-Gray-300 rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow"
              onClick={() => stopService()}
            >
              {t('speech-services.stop-service')}
            </button>
            <button
              className="primary-button h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
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

export default TranscriptionSettings;
