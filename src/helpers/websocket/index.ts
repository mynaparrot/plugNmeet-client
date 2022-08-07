import { store } from '../../store';
import { updateIsChatServiceReady } from '../../store/slices/sessionSlice';
import { handleSystemTypeData } from './handleSystemType';
import { handleUserTypeData } from './handleUserType';
import { handleWhiteboardMsg } from './handleWhiteboardType';
import { onAfterOpenConnection } from './handleAfterOpenConnection';
import { DataMessage, DataMsgType } from '../proto/plugnmeet_datamessage_pb';

let isConnected = false;
let ws: WebSocket | undefined;
let connectionInterval: any;
let reTried = 0;
let isNormalClose = false;

const createWS = () => {
  const url = getURL();
  ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    isConnected = true;
    onAfterOpenConnection();
    store.dispatch(updateIsChatServiceReady(true));

    if (connectionInterval) {
      clearInterval(connectionInterval);
      connectionInterval = 0;
      reTried = 0;
    }
  };

  ws.onclose = () => {
    isConnected = false;
    store.dispatch(updateIsChatServiceReady(false));

    if (!connectionInterval && !isNormalClose) {
      connectionInterval = setInterval(() => {
        if (reTried > 10) {
          clearInterval(connectionInterval);
          reTried = 0;
        }
        ws = undefined;
        createWS();
        reTried++;
      }, 2000);
    }
  };

  ws.onerror = () => {
    console.log('Error in websocket');
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

export const sendWebsocketMessage = (msg) => {
  if (isConnected) {
    ws?.send(msg);
  }
};

export const closeWebsocketConnection = () => {
  if (isConnected) {
    ws?.close();
    isNormalClose = true;
  }
};
