import axios, { AxiosError, ResponseType } from 'axios';
import { NatsMsgClientToServerEvents, NatsMsgClientToServerSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { getAccessToken, getConfigValue } from '../utils';
import { store } from '../../store';
import { getNatsConn } from '../nats';
import { toPnmApiError, wrapPnmApiErrorBytes } from './apiError';

const API = axios.create({
  baseURL:
    getConfigValue<string>('serverUrl', 'http://localhost:8080', 'PLUG_N_MEET_SERVER_URL') + '/api',
});

const getToken = () => {
  const token = store.getState().session.token;
  if (token) {
    return store.getState().session.token;
  }

  // this mostly happened during the first time before validation
  return getAccessToken();
};

export const requestToRenewPnmToken = () => {
  const token = getToken();
  if (token) {
    const conn = getNatsConn();
    if (conn) {
      conn.sendMessageToSystemWorker(
        create(NatsMsgClientToServerSchema, {
          event: NatsMsgClientToServerEvents.REQ_RENEW_PNM_TOKEN,
          msg: token,
        }),
      );
    }
  }
};

const sendAPIRequest = async (
  path: string,
  body: any,
  json_encode = true,
  content_type = 'application/json',
  response_type: ResponseType = 'json',
) => {
  try {
    if (json_encode) {
      body = JSON.stringify(body);
    }
    const res = await API.post(path, body, {
      headers: {
        Authorization: getToken(),
        'Content-Type': content_type,
      },
      responseType: response_type,
    });
    return res.data;
  } catch (e: any) {
    const err = e as AxiosError;
    const httpStatus = err.response?.status ?? 0;

    // if status = 401 then we'll try to renew token
    // so that next try will not be failing because of the expired token
    if (httpStatus === 401) {
      console.info(`Got status: ${httpStatus}, trying to renew token.`);
      requestToRenewPnmToken();
    }

    // failures always carry a CommonResponse; transport details stay internal
    const apiError = toPnmApiError(httpStatus, err.response?.data);
    console.error(`API request failed: ${path} (${httpStatus || 'no response'})`, apiError.msg);

    if (response_type === 'arraybuffer') {
      return wrapPnmApiErrorBytes(apiError);
    }
    return apiError;
  }
};

export default sendAPIRequest;
