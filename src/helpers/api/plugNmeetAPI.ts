import axios from 'axios';
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
  const params = Object.fromEntries(urlSearchParams.entries());
  return params.access_token;
};

const sendAPIRequest = async (path: string, body: any) => {
  try {
    const res = await API.post(path, JSON.stringify(body), {
      headers: {
        Authorization: getToken(),
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  } catch (e: any) {
    throw e.response;
  }
};

export default sendAPIRequest;
