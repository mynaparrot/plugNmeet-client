import axios, { ResponseType } from 'axios';
import { store } from '../../store';
import { CommonResponse } from '../proto/plugnmeet_common_api_pb';
import { getAccessToken } from '../utils';

const API = axios.create({
  baseURL: (window as any).PLUG_N_MEET_SERVER_URL + '/api',
});

const getToken = () => {
  const token = store.getState().session.token;
  if (token) {
    return store.getState().session.token;
  }

  // this mostly happened during the first time before validation
  return getAccessToken();
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
    console.error(e.message);
    if (!json_encode) {
      const res = new CommonResponse({
        status: false,
        msg: e.code + ': ' + e.message,
      });
      return res.toBinary();
    } else {
      return {
        status: false,
        msg: e.code + ': ' + e.message,
      };
    }
  }
};

export default sendAPIRequest;
