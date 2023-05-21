import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';

import SelectOptionBtn, { OnCloseSelectedOptions } from './selectOptionBtn';
import SubtitleArea from './subtitleArea';
import { RootState, useAppDispatch, useAppSelector } from '../../store';

import MicrophoneModal from '../footer/modals/microphoneModal';
import {
  getAzureToken,
  openConnectionWithAzure,
} from './helpers/apiConnections';
import { updateAzureTokenInfo } from '../../store/slices/roomSettingsSlice';

const speechServiceFeaturesSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .speech_to_text_translation_features,
  (speech_to_text_translation_features) => speech_to_text_translation_features,
);
const azureTokenInfoSelector = createSelector(
  (state: RootState) => state.roomSettings.azureTokenInfo,
  (azureTokenInfo) => azureTokenInfo,
);

const SpeechToTextService = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const speechService = useAppSelector(speechServiceFeaturesSelector);
  const azureTokenInfo = useAppSelector(azureTokenInfoSelector);

  const [speechLang, setSpeechLang] = useState<string>('');
  const [subtitleLang, setSubtitleLang] = useState<string>('');
  const [recognizer, setRecognizer] = useState<
    SpeechRecognizer | TranslationRecognizer | undefined
  >(undefined);
  const [showMicrophoneModal, setShowMicrophoneModal] =
    useState<boolean>(false);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    return () => {
      if (recognizer) {
        try {
          recognizer.stopContinuousRecognitionAsync();
          recognizer.close();
          setRecognizer(undefined);
        } catch (e) {}
      }
    };
  }, [recognizer]);

  useEffect(() => {
    if (isEmpty(speechLang)) {
      return;
    }
    setDeviceId('');
    setShowMicrophoneModal(true);
  }, [speechLang]);

  useEffect(() => {
    if (isEmpty(deviceId)) {
      return;
    }
    const getToken = async () => {
      const res = await getAzureToken();
      if (!res.status) {
        toast(t(res.msg), {
          type: 'error',
        });
      } else {
      }
    };
    getToken();
    //eslint-disable-next-line
  }, [deviceId]);

  useEffect(() => {
    if (
      speechService &&
      azureTokenInfo &&
      !isEmpty(azureTokenInfo) &&
      !isEmpty(deviceId) &&
      !isEmpty(speechLang)
    ) {
      openConnectionWithAzure(
        azureTokenInfo,
        deviceId,
        speechLang,
        speechService,
        setRecognizer,
      );
      dispatch(updateAzureTokenInfo(undefined));
    }
    //eslint-disable-next-line
  }, [azureTokenInfo, deviceId, speechLang, speechService]);

  const onCloseSelectedOptions = useCallback(
    (o: OnCloseSelectedOptions) => {
      if (!isEmpty(o.speechLang)) {
        setSpeechLang(`${o.speechLang}`);
      }
      if (!isEmpty(o.subtitleLang)) {
        setSubtitleLang(`${o.subtitleLang}`);
      }
      if (o.stopService && recognizer) {
        recognizer.stopContinuousRecognitionAsync();
        setRecognizer(undefined);
        setSpeechLang('');
        setDeviceId('');
      }
    },
    [recognizer],
  );

  const onCloseMicrophoneModal = async (deviceId) => {
    setShowMicrophoneModal(false);
    if (!isEmpty(deviceId)) {
      setDeviceId(deviceId);
    }
  };

  const onOpenSelectedOptionsModal = () => {
    setSpeechLang('');
  };

  return (
    <>
      {speechService ? (
        <div className="speechService absolute bottom-0 w-full">
          {showMicrophoneModal ? (
            <MicrophoneModal
              show={showMicrophoneModal}
              onCloseMicrophoneModal={onCloseMicrophoneModal}
            />
          ) : null}
          <SelectOptionBtn
            speechService={speechService}
            recognizer={recognizer}
            onCloseSelectedOptions={onCloseSelectedOptions}
            onOpenSelectedOptionsModal={onOpenSelectedOptionsModal}
          />
          {!isEmpty(subtitleLang) ? <SubtitleArea lang={subtitleLang} /> : null}
        </div>
      ) : null}
    </>
  );
};

export default SpeechToTextService;
