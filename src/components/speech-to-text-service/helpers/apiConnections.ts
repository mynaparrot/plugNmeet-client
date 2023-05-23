import { Dispatch } from 'react';
import { toast } from 'react-toastify';
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

import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../../../helpers/proto/plugnmeet_datamessage_pb';
import { sendWebsocketMessage } from '../../../helpers/websocket';
import {
  GenerateAzureTokenReq,
  SpeechServiceUserStatusReq,
  SpeechServiceUserStatusTasks,
  SpeechToTextTranslationReq,
} from '../../../helpers/proto/plugnmeet_speech_services_pb';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { CommonResponse } from '../../../helpers/proto/plugnmeet_common_api_pb';
import { store } from '../../../store';
import { SpeechServiceData } from '../../../store/slices/interfaces/SpeechServices';
import {
  ISession,
  SpeechToTextTranslationFeatures,
} from '../../../store/slices/interfaces/session';
import i18n from '../../../helpers/i18n';
import { supportedSpeechToTextLangs } from './supportedLangs';

export interface AzureTokenInfo {
  token: string;
  serviceRegion: string;
  keyId: string;
}

let session: ISession | undefined = undefined;

const getSession = () => {
  return store.getState().session;
};

export const openConnectionWithAzure = (
  azureInfo: AzureTokenInfo,
  deviceId: string,
  mediaStream: MediaStream | undefined,
  speechLang: string,
  speechService: SpeechToTextTranslationFeatures,
  setOptionSelectionDisabled: Dispatch<boolean>,
  setRecognizer: Dispatch<SpeechRecognizer | TranslationRecognizer | undefined>,
) => {
  let audioConfig: AudioConfig,
    speechConfig: SpeechConfig | SpeechTranslationConfig,
    recognizer: SpeechRecognizer | TranslationRecognizer,
    hasTranslation = false;

  if (!isEmpty(deviceId)) {
    audioConfig = AudioConfig.fromMicrophoneInput(deviceId);
  } else if (mediaStream) {
    audioConfig = AudioConfig.fromStreamInput(mediaStream);
  } else {
    toast(i18n.t('speech-services.mic-error'), {
      type: 'error',
    });
    return;
  }

  const sl = supportedSpeechToTextLangs.filter((l) => l.code === speechLang)[0];
  let transLangs: Array<string> = [];

  if (speechService.allowed_trans_langs?.length) {
    hasTranslation = true;
    speechConfig = SpeechTranslationConfig.fromAuthorizationToken(
      azureInfo.token,
      azureInfo.serviceRegion,
    );

    transLangs = speechService.allowed_trans_langs.filter(
      (l) => l !== sl.locale,
    );

    speechService.allowed_speech_langs
      ?.filter((l) => l !== sl.code)
      .forEach((s) => {
        const speechObj = supportedSpeechToTextLangs.filter(
          (l) => l.code === s,
        );
        const hasLang = transLangs.find((l) => l === speechObj[0].locale);
        if (!hasLang) {
          transLangs.push(speechObj[0].locale);
        }
      });

    transLangs.forEach((l) =>
      (speechConfig as SpeechTranslationConfig).addTargetLanguage(l),
    );
  } else {
    speechConfig = SpeechConfig.fromAuthorizationToken(
      azureInfo.token,
      azureInfo.serviceRegion,
    );
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

  recognizer.sessionStarted = async () => {
    setOptionSelectionDisabled(false);
    const res = await sendUserSessionStatus(
      SpeechServiceUserStatusTasks.SESSION_STARTED,
      azureInfo.keyId,
    );
    if (!res.status) {
      toast(i18n.t('speech-services.status-change-error', { error: res.msg }), {
        type: 'error',
      });
      if (recognizer) {
        try {
          recognizer.stopContinuousRecognitionAsync();
          recognizer.close();
          setRecognizer(undefined);
        } catch (e) {}
      }
    } else {
      toast(i18n.t('speech-services.speech-to-text-ready'), {
        type: 'success',
        autoClose: 3000,
      });
    }
  };
  recognizer.sessionStopped = async () => {
    await sendUserSessionStatus(
      SpeechServiceUserStatusTasks.SESSION_ENDED,
      azureInfo.keyId,
    );
  };

  recognizer.recognizing = (sender, recognitionEventArgs) => {
    const result = recognitionEventArgs.result;
    const data: SpeechServiceData = {
      lang: sl.locale,
      type: 'interim',
      text: result.text,
    };
    broadcastSpeechToTextMsgs(data);

    if (result.reason === ResultReason.TranslatingSpeech) {
      if (speechService) {
        transLangs.forEach((l) => {
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
      lang: sl.locale,
      type: 'final',
      text: result.text,
    };
    broadcastSpeechToTextMsgs(data);
    sendEmptyData(sl.locale);

    if (result.reason === ResultReason.TranslatedSpeech) {
      if (speechService) {
        transLangs.forEach((l) => {
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

  recognizer.canceled = () => {
    setOptionSelectionDisabled(false);
  };

  recognizer.startContinuousRecognitionAsync();
  setRecognizer(recognizer);
};

export const broadcastSpeechToTextMsgs = (msg) => {
  if (!session) {
    session = getSession();
  }

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

export const sendEmptyData = (language: string, type = 'interim') => {
  const data = {
    lang: language,
    type: type,
    text: '',
  };
  broadcastSpeechToTextMsgs(data);
};

export const getAzureToken = async () => {
  if (!session) {
    session = getSession();
  }
  const body = new GenerateAzureTokenReq({
    userSid: session?.currentUser?.sid,
  });
  const r = await sendAPIRequest(
    'speechServices/azureToken',
    body.toBinary(),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return CommonResponse.fromBinary(new Uint8Array(r));
};

export const sendUserSessionStatus = async (
  task: SpeechServiceUserStatusTasks,
  keyId: string,
) => {
  if (!session) {
    session = getSession();
  }
  const userId = session.currentUser?.userId;

  const body = new SpeechServiceUserStatusReq({
    task,
    userId,
    keyId,
  });

  const r = await sendAPIRequest(
    'speechServices/userStatus',
    body.toBinary(),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return CommonResponse.fromBinary(new Uint8Array(r));
};

export const enableOrDisableSpeechService = async (
  body: SpeechToTextTranslationReq,
) => {
  const r = await sendAPIRequest(
    'speechServices',
    body.toBinary(),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return CommonResponse.fromBinary(new Uint8Array(r));
};
