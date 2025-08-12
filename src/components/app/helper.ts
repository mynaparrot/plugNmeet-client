import type { Dispatch, SetStateAction } from 'react';
import { once } from 'es-toolkit';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  NatsSubjects,
  VerifyTokenReqSchema,
  VerifyTokenResSchema,
} from 'plugnmeet-protocol-js';

import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { IErrorPageProps } from '../extra-pages/Error';
import i18n from '../../helpers/i18n';
import { getAccessToken } from '../../helpers/utils';
import { store } from '../../store';
import { updateIsCloud } from '../../store/slices/sessionSlice';

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
    setLoading: Dispatch<SetStateAction<boolean>>,
    setError: Dispatch<SetStateAction<IErrorPageProps | undefined>>,
    setOpenConnInfo: Dispatch<SetStateAction<InfoToOpenConn | undefined>>,
    setRoomConnectionStatus: Dispatch<SetStateAction<roomConnectionStatus>>,
    setOpenConn: Dispatch<SetStateAction<boolean>>,
  ) => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setLoading(false);
      setError({
        title: i18n.t('app.token-missing-title'),
        text: i18n.t('app.token-missing-des'),
      });
      return;
    } else if (
      window.location.protocol === 'http:' &&
      window.location.hostname !== 'localhost'
    ) {
      setLoading(false);
      setError({
        title: i18n.t('app.require-ssl-title'),
        text: i18n.t('app.require-ssl-des'),
      });
      return;
    }

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
    const res = fromBinary(VerifyTokenResSchema, new Uint8Array(r));

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
      store.dispatch(updateIsCloud(!!res.isCloud));

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
