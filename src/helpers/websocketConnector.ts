import { toast } from 'react-toastify';

import { store } from '../store';
import {
  DataMessageType,
  IChatMsg,
  IDataMessage,
  SystemMsgType,
  WhiteboardMsg,
} from '../store/slices/interfaces/dataMessages';
import {
  addChatMessage,
  chatMessagesSelector,
} from '../store/slices/chatMessagesSlice';
import {
  addToken,
  updateIsChatServiceReady,
} from '../store/slices/sessionSlice';
import { ISession } from '../store/slices/interfaces/session';
import { participantsSelector } from '../store/slices/participantSlice';
import { updateTotalUnreadChatMsgs } from '../store/slices/bottomIconsActivitySlice';
import {
  addWhiteboardFileAsJSON,
  updateExcalidrawElements,
  updateMousePointerLocation,
  updateRequestedWhiteboardData,
} from '../store/slices/whiteboard';

let session: ISession;
let isConnected = false;
let ws: WebSocket | undefined;
let connectionInterval: any;
let reTried = 0;
let isNormalClose = false;

const createWS = () => {
  const url = getURL();
  ws = new WebSocket(url);

  ws.onopen = () => {
    isConnected = true;
    onConnect();
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
    let data: IDataMessage;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.log(event.data);
      return;
    }

    if (data.type === 'USER') {
      handleUserTypeData(data.body as IChatMsg, data.message_id);
    } else if (data.type === 'SYSTEM') {
      handleSystemTypeData(data);
    } else if (data.type === 'WHITEBOARD') {
      handleWhiteboardMsg(data.body as WhiteboardMsg);
    }
  }
};

const handleUserTypeData = (body: IChatMsg, message_id: string) => {
  if (body.type === 'CHAT') {
    if (!body.message_id) {
      body.message_id = message_id;
    }
    store.dispatch(addChatMessage(body));

    if (
      !body.isPrivate &&
      !store.getState().bottomIconsActivity.isActiveChatPanel
    ) {
      store.dispatch(updateTotalUnreadChatMsgs());
    }
  }
};

const handleSystemTypeData = (body: IDataMessage) => {
  switch (body.body.type) {
    // got request to send previous chat messages. We'll send last 30 messages
    case SystemMsgType.SEND_CHAT_MSGS:
      handleSendChatMsg(body);
      break;
    case SystemMsgType.INIT_WHITEBOARD:
      handleSendInitWhiteboard(body);
      break;
    case SystemMsgType.RENEW_TOKEN:
      handleRenewToken(body);
      break;
    case SystemMsgType.INFO:
    case SystemMsgType.ALERT:
      handlePushMsgMsg(body);
      break;
  }
};

const handleSendChatMsg = (mainBody: IDataMessage) => {
  const messages = chatMessagesSelector.selectAll(store.getState());
  messages
    .filter((msg) => msg.from.sid !== 'system')
    .slice(-30)
    .map(async (msg) => {
      const body = msg;
      const data: IDataMessage = {
        type: DataMessageType.USER,
        body,
        to: mainBody.body.from.sid,
        room_sid: session.currentRoom.sid,
        message_id: '',
      };
      sendWebsocketMessage(JSON.stringify(data));
    });
};

const handleSendInitWhiteboard = (mainBody: IDataMessage) => {
  if (store.getState().whiteboard.requestedWhiteboardData.requested) {
    // already have one request
    return;
  }
  // we'll update reducer only
  // component will take care for sending data
  store.dispatch(
    updateRequestedWhiteboardData({
      requested: true,
      sendTo: mainBody.body.from.sid,
    }),
  );
};

const handleRenewToken = (mainBody: IDataMessage) => {
  store.dispatch(addToken(mainBody.body.msg));
};

const handlePushMsgMsg = (mainBody: IDataMessage) => {
  switch (mainBody.body.type) {
    case SystemMsgType.INFO:
      toast(mainBody.body.msg, {
        toastId: 'info-status',
        type: 'info',
      });
      break;
    case SystemMsgType.ALERT:
      toast(mainBody.body.msg, {
        toastId: 'alert-status',
        type: 'warning',
      });
      break;
  }
};

const handleWhiteboardMsg = (data: WhiteboardMsg) => {
  if (data.type === 'SCENE_UPDATE') {
    store.dispatch(updateExcalidrawElements(data.msg));
  } else if (data.type === 'POINTER_UPDATE') {
    store.dispatch(updateMousePointerLocation(data.msg));
  } else if (data.type === 'ADD_WHITEBOARD_FILE') {
    store.dispatch(addWhiteboardFileAsJSON(data.msg));
  }
};

const onConnect = () => {
  const participants = participantsSelector
    .selectAll(store.getState())
    .filter((participant) => participant.sid !== session.currenUser?.sid);

  if (!participants.length) return;

  participants.sort((a, b) => {
    return a.joinedAt - b.joinedAt;
  });

  const donor = participants[0];

  // send initial chat messages
  const data: IDataMessage = {
    type: DataMessageType.SYSTEM,
    room_sid: session.currentRoom.sid,
    message_id: '',
    to: donor.sid,
    body: {
      type: SystemMsgType.SEND_CHAT_MSGS,
      from: {
        sid: session.currenUser?.sid ?? '',
        userId: session.currenUser?.userId ?? '',
      },
      msg: '',
    },
  };
  sendWebsocketMessage(JSON.stringify(data));

  // send initial whiteboard elements
  // this is also helpful if user got reconnect
  const whiteboardElms: IDataMessage = {
    type: DataMessageType.SYSTEM,
    room_sid: session.currentRoom.sid,
    message_id: '',
    to: donor.sid,
    body: {
      type: SystemMsgType.INIT_WHITEBOARD,
      from: {
        sid: session.currenUser?.sid ?? '',
        userId: session.currenUser?.userId ?? '',
      },
      msg: '',
    },
  };
  sendWebsocketMessage(JSON.stringify(whiteboardElms));
};

const getURL = () => {
  const url = new URL((window as any).PLUG_N_MEET_SERVER_URL);
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
  const currentUser = session.currenUser;
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
  session = store.getState().session;
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
