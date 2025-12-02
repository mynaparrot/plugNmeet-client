import {
  AzureTokenRenewReqSchema,
  CommonResponseSchema,
  DataMsgBodyType,
  GenerateAzureTokenReqSchema,
  InsightsChatTranslationConfigReq,
  InsightsChatTranslationConfigReqSchema,
  InsightsGetSupportedLanguagesReqSchema,
  InsightsGetSupportedLanguagesResSchema,
  InsightsGetUserStatusResSchema,
  InsightsServiceType,
  InsightsTranscriptionConfigReq,
  InsightsTranscriptionConfigReqSchema,
  InsightsTranscriptionUserSessionReqSchema,
  InsightsTranslateTextReq,
  InsightsTranslateTextReqSchema,
  InsightsTranslateTextResSchema,
  InsightsUserSessionAction,
  SpeechServiceUserStatusReqSchema,
  SpeechServiceUserStatusTasks,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { store } from '../../../store';
import { getNatsConn } from '../../../helpers/nats';
import { SpeechTextBroadcastFormat } from '../../../store/slices/interfaces/speechServices';

export interface AzureTokenInfo {
  token: string;
  serviceRegion: string;
  keyId: string;
  renew: boolean;
}

export const broadcastSpeechToTextMsg = async (
  msg: SpeechTextBroadcastFormat,
) => {
  const conn = getNatsConn();
  if (typeof conn !== 'undefined') {
    conn.sendDataMessage(
      DataMsgBodyType.SPEECH_SUBTITLE_TEXT,
      JSON.stringify(msg),
    );
  }
};

export const getAzureToken = async () => {
  const session = store.getState().session;
  const body = create(GenerateAzureTokenReqSchema, {
    userSid: session.currentUser?.sid,
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
  const session = store.getState().session;

  const azureTokenInfo = store.getState().roomSettings.azureTokenInfo;
  if (!azureTokenInfo) {
    return;
  }

  const body = create(AzureTokenRenewReqSchema, {
    userSid: session.currentUser?.sid,
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
  const session = store.getState().session;

  const body = create(SpeechServiceUserStatusReqSchema, {
    task,
    userId: session.currentUser?.userId,
    keyId,
    roomSid: session.currentRoom.sid,
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

export const enableOrUpdateTranscription = async (
  body: InsightsTranscriptionConfigReq,
) => {
  const r = await sendAPIRequest(
    'insights/transcription/configure',
    toBinary(InsightsTranscriptionConfigReqSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(CommonResponseSchema, new Uint8Array(r));
};

export const endTranscription = async () => {
  const r = await sendAPIRequest(
    'insights/transcription/end',
    [],
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(CommonResponseSchema, new Uint8Array(r));
};

export const startOrStopUserSession = async (
  action: InsightsUserSessionAction,
  allowedTranscriptionStorage: boolean,
  spokenLang?: string,
) => {
  const body = create(InsightsTranscriptionUserSessionReqSchema, {
    action,
    allowedTranscriptionStorage,
    spokenLang,
  });
  const r = await sendAPIRequest(
    'insights/transcription/userSession',
    toBinary(InsightsTranscriptionUserSessionReqSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(CommonResponseSchema, new Uint8Array(r));
};

export const getUserTaskStatus = async () => {
  const r = await sendAPIRequest(
    'insights/transcription/userStatus',
    {},
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(InsightsGetUserStatusResSchema, new Uint8Array(r));
};

export const getSupportedLanguages = async (
  serviceType: InsightsServiceType,
) => {
  const body = create(InsightsGetSupportedLanguagesReqSchema, {
    serviceType,
  });
  const r = await sendAPIRequest(
    'insights/supportedLangs',
    toBinary(InsightsGetSupportedLanguagesReqSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(InsightsGetSupportedLanguagesResSchema, new Uint8Array(r));
};

export const enableOrUpdateChatTranslation = async (
  body: InsightsChatTranslationConfigReq,
) => {
  const r = await sendAPIRequest(
    'insights/translation/chat/configure',
    toBinary(InsightsChatTranslationConfigReqSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(CommonResponseSchema, new Uint8Array(r));
};

export const executeChatTranslation = async (
  body: InsightsTranslateTextReq,
) => {
  const r = await sendAPIRequest(
    'insights/translation/chat/execute',
    toBinary(InsightsTranslateTextReqSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(InsightsTranslateTextResSchema, new Uint8Array(r));
};

export const endChatTranslation = async () => {
  const r = await sendAPIRequest(
    'insights/translation/chat/end',
    [],
    false,
    'application/protobuf',
    'arraybuffer',
  );
  return fromBinary(CommonResponseSchema, new Uint8Array(r));
};
