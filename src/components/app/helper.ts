import type { Dispatch, SetStateAction } from 'react';
import { once } from 'es-toolkit';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  NatsSubjects,
  VerifyTokenReqSchema,
  VerifyTokenRes,
  VerifyTokenResSchema,
} from 'plugnmeet-protocol-js';

import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { IErrorPageProps } from '../extra-pages/Error';
import i18n from '../../helpers/i18n';

declare const IS_PRODUCTION: boolean;

export type roomConnectionStatus =
  | 'loading'
  | 'connecting'
  | 'checking'
  | 'connected'
  | 'disconnected'
  | 're-connecting'
  | 'error'
  | 'receiving-data'
  | 'insert-e2ee-key'
  | 'ready'
  | 'media-server-conn-start'
  | 'media-server-conn-established';

export interface InfoToOpenConn {
  accessToken: string;
  serverVersion: string;
  natsWsUrls: string[];
  roomId: string;
  userId: string;
  natsSubjects: NatsSubjects;
}

export const verifyToken = once(
  async (
    accessToken: string,
    setLoading: Dispatch<SetStateAction<boolean>>,
    setError: Dispatch<SetStateAction<IErrorPageProps | undefined>>,
    setOpenConnInfo: Dispatch<SetStateAction<InfoToOpenConn | undefined>>,
    setRoomConnectionStatus: Dispatch<SetStateAction<roomConnectionStatus>>,
    setOpenConn: Dispatch<SetStateAction<boolean>>,
  ) => {
    let res: VerifyTokenRes;
    try {
      const r = await sendAPIRequest(
        'verifyToken',
        toBinary(
          VerifyTokenReqSchema,
          create(VerifyTokenReqSchema, {
            isProduction: IS_PRODUCTION,
          }),
        ),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      res = fromBinary(VerifyTokenResSchema, new Uint8Array(r));
    } catch (error: any) {
      console.error(error);
      setLoading(false);
      setError({
        title: i18n.t('app.verification-failed-title'),
        text: i18n.t('app.token-not-valid'),
      });
      return;
    }

    if (
      res.status &&
      res.natsWsUrls.length &&
      res.roomId &&
      res.userId &&
      res.natsSubjects
    ) {
      setOpenConnInfo({
        accessToken: accessToken,
        natsWsUrls: res.natsWsUrls,
        natsSubjects: res.natsSubjects,
        roomId: res.roomId,
        userId: res.userId,
        serverVersion: res.serverVersion ?? '',
      });

      if (res.enabledSelfInsertEncryptionKey) {
        setLoading(false);
        setRoomConnectionStatus('insert-e2ee-key');
      } else {
        setOpenConn(true);
      }
    } else {
      setLoading(false);
      setError({
        title: i18n.t('app.verification-failed-title'),
        text: i18n.t(res.msg),
      });
    }
  },
);
