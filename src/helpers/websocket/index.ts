import ReconnectingWebSocket from 'reconnecting-websocket';
import { toast } from 'react-toastify';

import { store } from '../../store';
import { updateIsChatServiceReady } from '../../store/slices/sessionSlice';
import { handleSystemTypeData } from './handleSystemType';
import { handleUserTypeData } from './handleUserType';
import { handleWhiteboardMsg } from './handleWhiteboardType';
import { onAfterOpenConnection } from './handleAfterOpenConnection';
import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../proto/plugnmeet_datamessage_pb';
import {
  AnalyticsDataMsg,
  AnalyticsEvents,
  AnalyticsEventType,
} from '../proto/plugnmeet_analytics_pb';
import i18n from '../i18n';

let isConnected = false,
  normallyClosed = false,
  isReconnecting = false,
  isFirstTime = true;
let ws: ReconnectingWebSocket;
const toastId = 'websocketStatus';

const createWS = () => {
  ws = new ReconnectingWebSocket(getURL, [], {
    minReconnectionDelay: 2000,
    maxRetries: 20,
  });
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    isConnected = true;
    isFirstTime = false;
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
        type: 'error',
        autoClose: false,
        toastId: toastId,
        closeButton: true,
      });
      isReconnecting = true;
    }
  };

  ws.onerror = () => {
    toast(i18n.t('notifications.websocket-error'), {
      type: 'error',
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
  if (!isFirstTime && !isConnected && !normallyClosed) {
    toast(i18n.t('notifications.websocket-not-connected'), {
      type: 'error',
      toastId: 'websocket-notify',
      autoClose: 2000,
    });
  }
  ws?.send(msg);
};

export const sendAnalyticsByWebsocket = (
  event_name: AnalyticsEvents,
  event_type: AnalyticsEventType = AnalyticsEventType.USER,
  hset_value?: string,
  event_value_string?: string,
  event_value_integer?: bigint,
) => {
  const session = store.getState().session;

  const analyticsMsg = new AnalyticsDataMsg({
    eventType: event_type,
    eventName: event_name,
    roomId: session.currentRoom.room_id,
    userId: session.currentUser?.userId,
    hsetValue: hset_value,
    eventValueString: event_value_string,
    eventValueInteger: event_value_integer,
  });

  const dataMsg = new DataMessage({
    type: DataMsgType.SYSTEM,
    roomSid: session.currentRoom.sid,
    roomId: session.currentRoom.room_id,
    body: {
      type: DataMsgBodyType.ANALYTICS_DATA,
      from: {
        sid: session.currentUser?.sid ?? '',
        userId: session.currentUser?.userId ?? '',
      },
      msg: analyticsMsg.toJsonString(),
    },
  });
  sendWebsocketMessage(dataMsg.toBinary());
};

export const closeWebsocketConnection = () => {
  if (isConnected) {
    normallyClosed = true;
    ws?.close();
  }
};
