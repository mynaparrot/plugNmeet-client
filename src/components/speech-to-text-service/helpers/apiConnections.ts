import {
  AzureTokenRenewReqSchema,
  CommonResponseSchema,
  DataMsgBodyType,
  GenerateAzureTokenReqSchema,
  SpeechServiceUserStatusReqSchema,
  SpeechServiceUserStatusTasks,
  SpeechToTextTranslationReq,
  SpeechToTextTranslationReqSchema,
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
