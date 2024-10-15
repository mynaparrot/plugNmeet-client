import { Dispatch } from 'react';
import { toast } from 'react-toastify';
import { isEmpty } from 'lodash';
import {
  AudioConfig,
  ResultReason,
  SpeechConfig,
  SpeechRecognitionCanceledEventArgs,
  SpeechRecognitionEventArgs,
  SpeechRecognizer,
  SpeechTranslationConfig,
  TranslationRecognitionResult,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import {
  GenerateAzureTokenReqSchema,
  SpeechToTextTranslationFeatures,
  SpeechServiceUserStatusTasks,
  SpeechToTextTranslationReq,
  DataMsgBodyType,
  CommonResponseSchema,
  AzureTokenRenewReqSchema,
  SpeechServiceUserStatusReqSchema,
  SpeechToTextTranslationReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { store } from '../../../store';
import { SpeechTextBroadcastFormat } from '../../../store/slices/interfaces/speechServices';
import { ISession } from '../../../store/slices/interfaces/session';
import i18n from '../../../helpers/i18n';
import { supportedSpeechToTextLangs } from './supportedLangs';
import { getNatsConn } from '../../../helpers/nats';

export interface AzureTokenInfo {
  token: string;
  serviceRegion: string;
  keyId: string;
  renew: boolean;
}

let session: ISession | undefined = undefined;

const getSession = () => {
  return store.getState().session;
};

export const openConnectionWithAzure = (
  azureInfo: AzureTokenInfo,
  mediaStream: MediaStream | undefined,
  speechLang: string,
  speechService: SpeechToTextTranslationFeatures,
  setOptionSelectionDisabled: Dispatch<boolean>,
  setRecognizer: Dispatch<SpeechRecognizer | TranslationRecognizer>,
  unsetRecognizer: () => void,
) => {
  let audioConfig: AudioConfig,
    speechConfig: SpeechConfig | SpeechTranslationConfig,
    recognizer: SpeechRecognizer | TranslationRecognizer;

  if (mediaStream) {
    audioConfig = AudioConfig.fromStreamInput(mediaStream);
  } else {
    toast(i18n.t('speech-services.mic-error'), {
      type: 'error',
    });
    return;
  }

  const sl = supportedSpeechToTextLangs.filter((l) => l.code === speechLang)[0];
  let transLangs: Array<string> = [];

  if (speechService.isEnabledTranslation) {
    if (speechService.allowedTransLangs?.length) {
      transLangs = speechService.allowedTransLangs.filter(
        (l) => l !== sl.locale,
      );
    }
    speechService.allowedSpeechLangs
      ?.filter((l) => l !== sl.code)
      .forEach((s) => {
        const speechObj = supportedSpeechToTextLangs.filter(
          (l) => l.code === s,
        );
        if (speechObj[0].locale === sl.locale) {
          // same locale, so we can avoid to add
          return;
        }
        const hasLang = transLangs.find((l) => l === speechObj[0].locale);
        if (!hasLang) {
          transLangs.push(speechObj[0].locale);
        }
      });
  }

  if (transLangs.length) {
    speechConfig = SpeechTranslationConfig.fromAuthorizationToken(
      azureInfo.token,
      azureInfo.serviceRegion,
    );
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

  if (transLangs.length) {
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
      SpeechServiceUserStatusTasks.SPEECH_TO_TEXT_SESSION_STARTED,
      azureInfo.keyId,
    );
    if (!res.status) {
      toast(i18n.t('speech-services.status-change-error', { error: res.msg }), {
        type: 'error',
      });
      if (recognizer) {
        unsetRecognizer();
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
      SpeechServiceUserStatusTasks.SPEECH_TO_TEXT_SESSION_ENDED,
      azureInfo.keyId,
    );
    toast(i18n.t('speech-services.speech-to-text-stopped'), {
      type: 'success',
      autoClose: 3000,
    });
  };

  recognizer.recognizing = async (
    sender,
    recognitionEventArgs: SpeechRecognitionEventArgs,
  ) => {
    const result = recognitionEventArgs.result;
    const data: SpeechTextBroadcastFormat = {
      type: 'interim',
      from: session?.currentUser?.name ?? '',
      result: {
        [sl.locale]: result.text,
      },
    };

    if (result.reason === ResultReason.TranslatingSpeech) {
      if (speechService) {
        transLangs.forEach((l) => {
          const text = (
            result as TranslationRecognitionResult
          ).translations.get(l);
          if (!isEmpty(text)) {
            data.result[l] = text;
          }
        });
      }
    }
    await broadcastSpeechToTextMsgs(data);
  };

  recognizer.recognized = async (
    sender,
    recognitionEventArgs: SpeechRecognitionEventArgs,
  ) => {
    const result = recognitionEventArgs.result;
    const data: SpeechTextBroadcastFormat = {
      type: 'final',
      from: session?.currentUser?.name ?? '',
      result: {
        [sl.locale]: result.text,
      },
    };

    if (result.reason === ResultReason.TranslatedSpeech) {
      if (speechService) {
        transLangs.forEach((l) => {
          const text = (
            result as TranslationRecognitionResult
          ).translations.get(l);
          if (!isEmpty(text)) {
            data.result[l] = text;
          }
        });
      }
    }
    await broadcastSpeechToTextMsgs(data);
  };

  recognizer.canceled = async (s, e: SpeechRecognitionCanceledEventArgs) => {
    setOptionSelectionDisabled(false);
    await sendUserSessionStatus(
      SpeechServiceUserStatusTasks.SPEECH_TO_TEXT_SESSION_ENDED,
      azureInfo.keyId,
    );
    toast(
      i18n.t('speech-services.azure-error', {
        error: e.errorCode + ': ' + e.errorDetails,
      }),
      {
        type: 'error',
      },
    );
    unsetRecognizer();
  };

  recognizer.startContinuousRecognitionAsync();
  setRecognizer(recognizer);
};

export const broadcastSpeechToTextMsgs = async (msg: any) => {
  const conn = getNatsConn();
  if (typeof conn !== 'undefined') {
    conn.sendDataMessage(
      DataMsgBodyType.SPEECH_SUBTITLE_TEXT,
      JSON.stringify(msg),
    );
  }
};

export const getAzureToken = async () => {
  if (!session) {
    session = getSession();
  }
  const body = create(GenerateAzureTokenReqSchema, {
    userSid: session?.currentUser?.sid,
  });
  const r = await sendAPIRequest(
    'speechServices/azureToken',
    toBinary(GenerateAzureTokenReqSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(CommonResponseSchema, new Uint8Array(r));
};

export const renewAzureToken = async () => {
  if (!session) {
    session = getSession();
  }

  const azureTokenInfo = store.getState().roomSettings.azureTokenInfo;
  if (!azureTokenInfo) {
    return;
  }

  const body = create(AzureTokenRenewReqSchema, {
    userSid: session?.currentUser?.sid,
    serviceRegion: azureTokenInfo.serviceRegion,
    keyId: azureTokenInfo.keyId,
  });

  const r = await sendAPIRequest(
    'speechServices/renewToken',
    toBinary(AzureTokenRenewReqSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(CommonResponseSchema, new Uint8Array(r));
};

export const sendUserSessionStatus = async (
  task: SpeechServiceUserStatusTasks,
  keyId: string,
) => {
  if (!session) {
    session = getSession();
  }
  const userId = session.currentUser?.userId;

  const body = create(SpeechServiceUserStatusReqSchema, {
    task,
    userId,
    keyId,
    roomSid: session?.currentRoom.sid,
  });

  const r = await sendAPIRequest(
    'speechServices/userStatus',
    toBinary(SpeechServiceUserStatusReqSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(CommonResponseSchema, new Uint8Array(r));
};

export const enableOrDisableSpeechService = async (
  body: SpeechToTextTranslationReq,
) => {
  const r = await sendAPIRequest(
    'speechServices/serviceStatus',
    toBinary(SpeechToTextTranslationReqSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(CommonResponseSchema, new Uint8Array(r));
};
