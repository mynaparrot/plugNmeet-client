import React, { useCallback, useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import { Room, Track } from 'livekit-client';

import SubtitleArea from './subtitleArea';
import { RootState, useAppDispatch, useAppSelector } from '../../store';

import {
  getAzureToken,
  openConnectionWithAzure,
} from './helpers/apiConnections';
import { updateAzureTokenInfo } from '../../store/slices/roomSettingsSlice';
import SelectOptions from './selectOptions';
import { OnCloseSelectedOptions } from './selectOptions';
import { updateSelectedSubtitleLang } from '../../store/slices/speechServicesSlice';
import SubtitleTextsHistory from './subtitleTextsHistory';

interface SpeechToTextServiceProps {
  currentRoom: Room;
}

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

const SpeechToTextService = ({ currentRoom }: SpeechToTextServiceProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const speechService = useAppSelector(speechServiceFeaturesSelector);
  const azureTokenInfo = useAppSelector(azureTokenInfoSelector);

  const [speechLang, setSpeechLang] = useState<string>('');
  const [recognizer, setRecognizer] = useState<
    SpeechRecognizer | TranslationRecognizer | undefined
  >(undefined);
  const [deviceId, setDeviceId] = useState<string>('');
  const [mediaStream, setMediaStream] = useState<MediaStream | undefined>(
    undefined,
  );
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
    if (isEmpty(deviceId) && !mediaStream) {
      return;
    }
    if (isEmpty(speechLang)) {
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
  }, [deviceId, mediaStream, speechLang]);

  useEffect(() => {
    if (isEmpty(deviceId) && !mediaStream) {
      return;
    }
    if (
      speechService &&
      azureTokenInfo &&
      !isEmpty(azureTokenInfo) &&
      !isEmpty(speechLang)
    ) {
      setOptionSelectionDisabled(true);
      openConnectionWithAzure(
        azureTokenInfo,
        deviceId,
        mediaStream,
        speechLang,
        speechService,
        setOptionSelectionDisabled,
        setRecognizer,
      );
      dispatch(updateAzureTokenInfo(undefined));
    }
    //eslint-disable-next-line
  }, [azureTokenInfo, deviceId, mediaStream, speechLang, speechService]);

  const onCloseSelectedOptions = useCallback(
    (o: OnCloseSelectedOptions) => {
      dispatch(updateSelectedSubtitleLang(o.subtitleLang));

      if (!isEmpty(o.speechLang)) {
        setSpeechLang(`${o.speechLang}`);
      }
      if (!isEmpty(o.micDevice)) {
        setDeviceId(o.micDevice);
        setMediaStream(undefined);
      } else {
        currentRoom.localParticipant.audioTracks.forEach((publication) => {
          if (
            publication.track &&
            publication.track.source === Track.Source.Microphone &&
            publication.track.mediaStream
          ) {
            setMediaStream(publication.track.mediaStream);
          }
        });
      }
      if (o.stopService && recognizer) {
        recognizer.stopContinuousRecognitionAsync();
        setRecognizer(undefined);
        setSpeechLang('');
        setDeviceId('');
        setMediaStream(undefined);
      }
    },
    //eslint-disable-next-line
    [currentRoom.localParticipant.audioTracks, recognizer],
  );

  const onOpenSelectedOptionsModal = () => {
    setSpeechLang('');
    setDeviceId('');
    setMediaStream(undefined);
  };

  return (
    <>
      {speechService ? (
        <div className="speechService absolute bottom-0 w-full z-50">
          <SelectOptions
            optionSelectionDisabled={optionSelectionDisabled}
            speechService={speechService}
            recognizer={recognizer}
            onCloseSelectedOptions={onCloseSelectedOptions}
            onOpenSelectedOptionsModal={onOpenSelectedOptionsModal}
          />
          <SubtitleTextsHistory />
          <SubtitleArea />
        </div>
      ) : null}
    </>
  );
};

export default SpeechToTextService;
