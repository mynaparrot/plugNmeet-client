import React, { useCallback, useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';

import SubtitleArea from './subtitleArea';
import { RootState, useAppDispatch, useAppSelector } from '../../store';

import {
  getAzureToken,
  openConnectionWithAzure,
} from './helpers/apiConnections';
import { updateAzureTokenInfo } from '../../store/slices/roomSettingsSlice';
import SelectOptions from './selectOptions';
import { OnCloseSelectedOptions } from './selectOptions';

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
  const [deviceId, setDeviceId] = useState<string>('');
  const [optionSelectionDisabled, setOptionSelectionDisabled] =
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
    if (isEmpty(deviceId)) {
      return;
    }
    const getToken = async () => {
      setOptionSelectionDisabled(true);
      const res = await getAzureToken();
      if (!res.status) {
        toast(t(res.msg), {
          type: 'error',
        });
      }
      setOptionSelectionDisabled(false);
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
      setOptionSelectionDisabled(true);
      openConnectionWithAzure(
        azureTokenInfo,
        deviceId,
        speechLang,
        speechService,
        setOptionSelectionDisabled,
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
      if (!isEmpty(o.micDevice)) {
        setDeviceId(o.micDevice);
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

  const onOpenSelectedOptionsModal = () => {
    setSpeechLang('');
    setDeviceId('');
  };

  return (
    <>
      {speechService ? (
        <div className="speechService absolute bottom-0 w-full">
          <SelectOptions
            optionSelectionDisabled={optionSelectionDisabled}
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
