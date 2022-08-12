import axios, { ResponseType } from 'axios';
import { store } from '../../store';

const API = axios.create({
  baseURL: (window as any).PLUG_N_MEET_SERVER_URL + '/api',
});

const getToken = () => {
  const token = store.getState().session.token;
  if (token) {
    return store.getState().session.token;
  }

  // this mostly happened first time.
  const urlSearchParams = new URLSearchParams(window.location.search);
  return urlSearchParams.get('access_token') ?? '';
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
    console.error(e.response);
  }
};

export default sendAPIRequest;
