import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { SpeechToTextTranslationReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { updateDisplaySpeechSettingsModal } from '../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch, useAppSelector } from '../../../store';
import { enableOrDisableSpeechService } from '../helpers/apiConnections';
import { validateSettings } from '../helpers/modalUtils';

import Modal from '../../../helpers/ui/modal';
import SpeechLangsSelector from './speechLangsSelector';
import SpeechUsersSelector from './speechUsersSelector';
import TransLangsSelector from './transLangsSelector';
import DefaultSubtitleLangSelector from './defaultSubtitleLangSelector';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';

const TranscriptionSettingsModal = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const speechService = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.speechToTextTranslationFeatures,
  );
  const [enabledTranscription, setEnabledTranscription] = useState<boolean>(
    !!speechService?.isEnabled,
  );

  const [selectedSpeechLangs, setSelectedSpeechLangs] = useState<string[]>(
    speechService?.allowedSpeechLangs ?? [],
  );
  const [selectedSpeechUsers, setSelectedSpeechUsers] = useState<string[]>(
    speechService?.allowedSpeechUsers ?? [],
  );

  const [enableTranslation, setEnableTranslation] = useState<boolean>(
    !!speechService?.isEnabledTranslation,
  );
  const [selectedTransLangs, setSelectedTransLangs] = useState<string[]>(
    speechService?.allowedTransLangs ?? [],
  );
  const [selectedDefaultSubtitleLang, setSelectedDefaultSubtitleLang] =
    useState<string>(speechService?.defaultSubtitleLang ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const enableOrUpdateService = async () => {
    const validation = validateSettings({
      selectedSpeechUsers,
      selectedSpeechLangs,
      enableTranslation,
      selectedTransLangs,
    });
    if (!validation.isValid) {
      setValidationError(t(validation.message!));
      return;
    }

    const body = create(SpeechToTextTranslationReqSchema, {
      isEnabled: true,
      allowedSpeechLangs: selectedSpeechLangs,
      allowedSpeechUsers: selectedSpeechUsers,
      isEnabledTranslation: enableTranslation,
      allowedTransLangs: selectedTransLangs,
      defaultSubtitleLang: selectedDefaultSubtitleLang,
    });

    const res = await enableOrDisableSpeechService(body);

    if (res.status) {
      toast(t('speech-services.service-ready'), {
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
      return;
    }

    dispatch(updateDisplaySpeechSettingsModal(false));
  };

  const stopService = async () => {
    const body = create(SpeechToTextTranslationReqSchema, {
      isEnabled: false,
      allowedSpeechLangs: [],
      allowedSpeechUsers: [],
      isEnabledTranslation: false,
      allowedTransLangs: [],
    });
    const res = await enableOrDisableSpeechService(body);

    if (res.status) {
      toast(t('speech-services.service-stopped'), {
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
      return;
    }

    dispatch(updateDisplaySpeechSettingsModal(false));
  };

  // This effect will clear the validation error as soon as the user
  // starts changing the settings, providing a better user experience.
  useEffect(() => {
    if (validationError) {
      setValidationError(null);
    }
    //eslint-disable-next-line
  }, [
    selectedSpeechLangs,
    selectedSpeechUsers,
    enableTranslation,
    selectedTransLangs,
  ]);

  const renderContent = () => (
    <div className="main-wrap -my-4">
      {validationError && (
        <div className="error-message mx-1 mb-2 px-3 py-2 border border-Red-400 bg-Red-25 rounded-lg text-sm text-center">
          {validationError}
        </div>
      )}
      <div className="grid">
        <div className="bg-Gray-25 border-y border-dotted border-Gray-100 -mx-4 px-4 py-4">
          <SettingsSwitch
            label={t('speech-services.enable-transcription')}
            enabled={enabledTranscription}
            onChange={setEnabledTranscription}
            customCss="shadow-Icon-box h-11 border border-Gray-100 rounded-2xl px-4 bg-white"
          />
        </div>
        {enabledTranscription && (
          <div className="grid gap-4 py-4 bg-white">
            <SpeechLangsSelector
              selectedSpeechLangs={selectedSpeechLangs}
              setSelectedSpeechLangs={setSelectedSpeechLangs}
            />
            <SpeechUsersSelector
              selectedSpeechUsers={selectedSpeechUsers}
              setSelectedSpeechUsers={setSelectedSpeechUsers}
            />
            <DefaultSubtitleLangSelector
              selectedSpeechLangs={selectedSpeechLangs}
              selectedTransLangs={selectedTransLangs}
              selectedDefaultSubtitleLang={selectedDefaultSubtitleLang}
              setSelectedDefaultSubtitleLang={setSelectedDefaultSubtitleLang}
            />
          </div>
        )}
        <div className="bg-Gray-25 border-y border-dotted border-Gray-100 -mx-4 px-4 py-4">
          <SettingsSwitch
            label={t('speech-services.enable-translation')}
            enabled={enableTranslation}
            onChange={setEnableTranslation}
            customCss="shadow-Icon-box h-11 border border-Gray-100 rounded-2xl px-4 bg-white"
          />
        </div>
        {enableTranslation && (
          <div className="grid gap-4 py-4 bg-white">
            <TransLangsSelector
              selectedTransLangs={selectedTransLangs}
              setSelectedTransLangs={setSelectedTransLangs}
              maxLangsAllowSelecting={
                speechService?.maxNumTranLangsAllowSelecting ?? 2
              }
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderButtons = () => (
    <div
      className={`w-full grid ${speechService?.isEnabled ? 'grid-cols-3 gap-x-2' : 'grid-cols-2 gap-x-5'}`}
    >
      <button
        className="h-10 px-8 w-full cursor-pointer text-sm 3xl:text-base font-semibold bg-white hover:bg-Red-600 border border-Gray-300 rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow"
        onClick={() => dispatch(updateDisplaySpeechSettingsModal(false))}
      >
        {t('cancel')}
      </button>
      {!speechService?.isEnabled && (
        <button
          className="h-10 px-8 w-full cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
          onClick={() => enableOrUpdateService()}
        >
          {t('speech-services.enable-service')}
        </button>
      )}
      {speechService?.isEnabled && (
        <>
          <button
            className="order-3 h-10 px-8 w-full cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
            onClick={() => enableOrUpdateService()}
          >
            {t('speech-services.update-service')}
          </button>
          <button
            className="order-2 h-10 px-8 w-full cursor-pointer text-sm 3xl:text-base font-semibold bg-white hover:bg-Red-600 border border-Gray-300 rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow"
            onClick={() => stopService()}
          >
            {t('speech-services.stop-service')}
          </button>
        </>
      )}
    </div>
  );

  return (
    <Modal
      show={true}
      onClose={() => dispatch(updateDisplaySpeechSettingsModal(false))}
      title={t('speech-services.modal-settings-title')}
      renderButtons={renderButtons}
      customClass="SpeechToTextModal"
      maxWidth="max-w-2xl"
    >
      {renderContent()}
    </Modal>
  );
};

export default TranscriptionSettingsModal;
