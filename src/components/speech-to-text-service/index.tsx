import React, { useCallback, useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';

import SelectOptionBtn, { OnCloseSelectedOptions } from './selectOptionBtn';
import SubtitleArea from './subtitleArea';
import { RootState, useAppSelector } from '../../store';

import { toast } from 'react-toastify';
import MicrophoneModal from '../footer/modals/microphoneModal';
import {
  AzureTokenInfo,
  getAzureToken,
  openConnectionWithAzure,
} from './helpers/apiConnections';

const speechServiceFeaturesSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .speech_to_text_translation_features,
  (speech_to_text_translation_features) => speech_to_text_translation_features,
);

const SpeechToTextService = () => {
  const speechService = useAppSelector(speechServiceFeaturesSelector);

  const [speechLang, setSpeechLang] = useState<string>('');
  const [subtitleLang, setSubtitleLang] = useState<string>('');
  const [azureInfo, setAzureInfo] = useState<AzureTokenInfo>({
    token: '',
    serviceRegion: '',
    keyId: '',
  });
  const [recognizer, setRecognizer] = useState<
    SpeechRecognizer | TranslationRecognizer | undefined
  >(undefined);
  const [showMicrophoneModal, setShowMicrophoneModal] =
    useState<boolean>(false);

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
    const getToken = async () => {
      const res = await getAzureToken();
      if (res.status && res.token && res.serviceRegion && res.keyId) {
        setAzureInfo({
          token: res.token,
          serviceRegion: res.serviceRegion,
          keyId: res.keyId,
        });
        setShowMicrophoneModal(true);
      } else {
        toast(res.msg, {
          type: 'error',
        });
      }
    };
    getToken();
  }, [speechLang]);

  const onCloseSelectedOptions = useCallback(
    (o: OnCloseSelectedOptions) => {
      if (!isEmpty(o.speechLang)) {
        setSpeechLang(o.speechLang);
      }
      if (!isEmpty(o.subtitleLang)) {
        setSubtitleLang(o.subtitleLang);
      }
      if (o.stopService && recognizer) {
        recognizer.stopContinuousRecognitionAsync();
        setRecognizer(undefined);
        setSpeechLang('');
      }
    },
    [recognizer],
  );

  const onCloseMicrophoneModal = (deviceId) => {
    setShowMicrophoneModal(false);
    if (!isEmpty(deviceId)) {
      _openConnectionWithAzure(azureInfo, deviceId);
    }
  };

  const _openConnectionWithAzure = (
    azureInfo: AzureTokenInfo,
    deviceId: string,
  ) => {
    if (speechService) {
      openConnectionWithAzure(
        azureInfo,
        deviceId,
        speechLang,
        speechService,
        setRecognizer,
      );
    }
  };

  return (
    <>
      {speechService ? (
        <div>
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
          />
          {!isEmpty(subtitleLang) ? <SubtitleArea lang={subtitleLang} /> : null}
        </div>
      ) : null}
    </>
  );
};

export default SpeechToTextService;
