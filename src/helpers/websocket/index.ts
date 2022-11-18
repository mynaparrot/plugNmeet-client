import ReconnectingWebSocket from 'reconnecting-websocket';
import { toast } from 'react-toastify';

import { store } from '../../store';
import { updateIsChatServiceReady } from '../../store/slices/sessionSlice';
import { handleSystemTypeData } from './handleSystemType';
import { handleUserTypeData } from './handleUserType';
import { handleWhiteboardMsg } from './handleWhiteboardType';
import { onAfterOpenConnection } from './handleAfterOpenConnection';
import { DataMessage, DataMsgType } from '../proto/plugnmeet_datamessage_pb';
import i18n from '../i18n';

let isConnected = false,
  normallyClosed = false,
  isReconnecting = false;
let ws: ReconnectingWebSocket;
const toastId = 'websocketStatus';

const createWS = () => {
  ws = new ReconnectingWebSocket(getURL, [], {
    connectionTimeout: 4000,
    maxRetries: 20,
  });
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    isConnected = true;
    onAfterOpenConnection();
    store.dispatch(updateIsChatServiceReady(true));

    if (isReconnecting) {
      isReconnecting = false;
      toast.dismiss(toastId);
    }
  };

  ws.onclose = () => {
    isConnected = false;
    store.dispatch(updateIsChatServiceReady(false));

    if (!normallyClosed) {
      toast.loading(i18n.t('notifications.websocket-disconnected'), {
        type: toast.TYPE.ERROR,
        autoClose: false,
        toastId: toastId,
        closeButton: true,
      });
      isReconnecting = true;
    }
  };

  ws.onerror = () => {
    toast(i18n.t('notifications.websocket-error'), {
      type: toast.TYPE.ERROR,
      autoClose: 5000,
      toastId: toastId,
    });
  };

  ws.onmessage = (event: any) => {
    onMessage(event);
  };
};

const onMessage = (event: any) => {
  if (event.data) {
    let data: DataMessage;
    try {
      data = DataMessage.fromBinary(new Uint8Array(event.data));
    } catch (e) {
      console.error(e);
      return;
    }

    if (data.type === DataMsgType.USER && data.body) {
      handleUserTypeData(data.body, data.messageId, data.to);
    } else if (data.type === DataMsgType.SYSTEM) {
      handleSystemTypeData(data);
    } else if (data.type === DataMsgType.WHITEBOARD) {
      if (data.body) {
        handleWhiteboardMsg(data.body);
      }
    }
  }
};

const getURL = () => {
  const url = new URL((window as any).PLUG_N_MEET_SERVER_URL);
  const session = store.getState().session;
  let webSocketUrl: string;
  let protocol = 'ws://';

  if (url.protocol === 'https:') {
    protocol = 'wss://';
  }
  webSocketUrl = protocol + url.host;

  if (url.pathname !== '/') {
    webSocketUrl = webSocketUrl + url.pathname;
  }
  const token = session.token;
  const currentUser = session.currentUser;
  const currentRoom = session.currentRoom;

  webSocketUrl =
    webSocketUrl +
    '/ws?token=' +
    token +
    '&roomSid=' +
    currentRoom.sid +
    '&userSid=' +
    currentUser?.sid +
    '&roomId=' +
    currentRoom.room_id +
    '&userId=' +
    currentUser?.userId;

  return webSocketUrl;
};

export const openWebsocketConnection = () => {
  createWS();
};

export const isSocketConnected = () => isConnected;

export const sendWebsocketMessage = (msg: any) => {
  ws?.send(msg);
};

export const closeWebsocketConnection = () => {
  if (isConnected) {
    normallyClosed = true;
    ws?.close();
  }
};
