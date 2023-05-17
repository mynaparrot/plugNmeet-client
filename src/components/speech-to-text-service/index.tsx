import React, { useCallback, useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';
import {
  AudioConfig,
  ResultReason,
  SpeechConfig,
  SpeechRecognizer,
  SpeechTranslationConfig,
  TranslationRecognitionResult,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';

import SelectOptionBtn, { OnCloseSelectedOptions } from './selectOptionBtn';
import SubtitleArea from './subtitleArea';
import { RootState, store, useAppSelector } from '../../store';
import {
  GenerateAzureTokenReq,
  GenerateAzureTokenRes,
} from '../../helpers/proto/plugnmeet_speech_services_pb';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { toast } from 'react-toastify';
import MicrophoneModal from '../footer/modals/microphoneModal';
import { SpeechServiceData } from '../../store/slices/interfaces/SpeechServices';
import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../../helpers/proto/plugnmeet_datamessage_pb';
import { sendWebsocketMessage } from '../../helpers/websocket';

const speechServiceFeaturesSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .speech_to_text_translation_features,
  (speech_to_text_translation_features) => speech_to_text_translation_features,
);

const SpeechToTextService = () => {
  const speechService = useAppSelector(speechServiceFeaturesSelector);
  const session = store.getState().session;

  const [speechLang, setSpeechLang] = useState<string>('');
  const [subtitleLang, setSubtitleLang] = useState<string>('');
  const [azureInfo, setAzureInfo] = useState({
    token: '',
    serviceRegion: '',
  });
  const [recognizer, setRecognizer] = useState<
    SpeechRecognizer | TranslationRecognizer | undefined
  >(undefined);
  const [showMicrophoneModal, setShowMicrophoneModal] =
    useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (recognizer) {
        recognizer.stopContinuousRecognitionAsync();
        setRecognizer(undefined);
      }
    };
  }, [recognizer]);

  useEffect(() => {
    if (isEmpty(speechLang)) {
      return;
    }
    getAzureToken();
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

  const getAzureToken = async () => {
    const body = new GenerateAzureTokenReq();
    const r = await sendAPIRequest(
      'speechServices/azureToken',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = GenerateAzureTokenRes.fromBinary(new Uint8Array(r));

    if (res.status && res.token && res.serviceRegion) {
      setAzureInfo({
        token: res.token,
        serviceRegion: res.serviceRegion,
      });
      setShowMicrophoneModal(true);
    } else {
      toast(r.msg, {
        type: 'error',
      });
    }
  };

  const onCloseMicrophoneModal = (deviceId) => {
    setShowMicrophoneModal(false);
    if (!isEmpty(deviceId)) {
      openConnectionWithAzure(
        azureInfo.token,
        azureInfo.serviceRegion,
        deviceId,
      );
    }
  };

  const openConnectionWithAzure = (
    token: string,
    serviceRegion: string,
    deviceId: string,
  ) => {
    const audioConfig = AudioConfig.fromMicrophoneInput(deviceId);
    let hasTranslation = false;

    let speechConfig: SpeechConfig | SpeechTranslationConfig;
    let recognizer: SpeechRecognizer | TranslationRecognizer;

    if (speechService && speechService.allowed_trans_langs?.length) {
      hasTranslation = true;
      speechConfig = SpeechTranslationConfig.fromAuthorizationToken(
        token,
        serviceRegion,
      );
      speechService.allowed_trans_langs.forEach((l) =>
        (speechConfig as SpeechTranslationConfig).addTargetLanguage(l),
      );
    } else {
      speechConfig = SpeechConfig.fromAuthorizationToken(token, serviceRegion);
    }

    speechConfig.speechRecognitionLanguage = speechLang;
    speechConfig.enableDictation();

    if (hasTranslation) {
      recognizer = new TranslationRecognizer(
        speechConfig as SpeechTranslationConfig,
        audioConfig,
      );
    } else {
      recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    }
    const sl = speechLang.split('-')[0];

    recognizer.recognizing = (sender, recognitionEventArgs) => {
      const result = recognitionEventArgs.result;
      const data: SpeechServiceData = {
        lang: sl,
        type: 'interim',
        text: result.text,
      };
      broadcastSpeechToTextMsgs(data);

      if (result.reason === ResultReason.TranslatingSpeech) {
        if (speechService) {
          speechService.allowed_trans_langs?.forEach((l) => {
            const text = (
              result as TranslationRecognitionResult
            ).translations.get(l);
            if (!isEmpty(text)) {
              const data: SpeechServiceData = {
                lang: l,
                type: 'interim',
                text,
              };
              broadcastSpeechToTextMsgs(data);
            }
          });
        }
      }
    };

    recognizer.recognized = (sender, recognitionEventArgs) => {
      const result = recognitionEventArgs.result;
      const data: SpeechServiceData = {
        lang: sl,
        type: 'final',
        text: result.text,
      };
      broadcastSpeechToTextMsgs(data);
      sendEmptyData(sl);

      if (result.reason === ResultReason.TranslatedSpeech) {
        if (speechService) {
          speechService.allowed_trans_langs?.forEach((l) => {
            const text = (
              result as TranslationRecognitionResult
            ).translations.get(l);
            if (!isEmpty(text)) {
              const data: SpeechServiceData = {
                lang: l,
                type: 'final',
                text,
              };
              broadcastSpeechToTextMsgs(data);
              sendEmptyData(l);
            }
          });
        }
      }
    };

    recognizer.startContinuousRecognitionAsync();
    setRecognizer(recognizer);
  };

  const broadcastSpeechToTextMsgs = (msg) => {
    const dataMsg = new DataMessage({
      type: DataMsgType.SYSTEM,
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.room_id,
      body: {
        type: DataMsgBodyType.SPEECH_SUBTITLE_TEXT,
        from: {
          sid: session.currentUser?.sid ?? '',
          userId: session.currentUser?.userId ?? '',
        },
        msg: JSON.stringify(msg),
      },
    });

    sendWebsocketMessage(dataMsg.toBinary());
  };

  const sendEmptyData = (language: string, type = 'interim') => {
    const data = {
      lang: language,
      type: type,
      text: '',
    };
    broadcastSpeechToTextMsgs(data);
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
