import React from 'react';
import { toast } from 'react-toastify';

import {
  DataMessageType,
  IDataMessage,
  SystemMsgType,
} from '../../store/slices/interfaces/dataMessages';
import { chatMessagesSelector } from '../../store/slices/chatMessagesSlice';
import { store } from '../../store';
import { updateRequestedWhiteboardData } from '../../store/slices/whiteboard';
import { addToken } from '../../store/slices/sessionSlice';
import { sendWebsocketMessage } from './index';
import { updateParticipant } from '../../store/slices/participantSlice';
import {
  addExternalMediaPlayerAction,
  externalMediaPlayerSeekTo,
} from '../../store/slices/externalMediaPlayer';
import { pollsApi } from '../../store/services/pollsApi';
import NewPollMsg from '../../components/extra-pages/newPollMsg';
import { updateReceivedInvitationFor } from '../../store/slices/breakoutRoomSlice';
import { breakoutRoomApi } from '../../store/services/breakoutRoomApi';

export const handleSystemTypeData = (body: IDataMessage) => {
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
    case SystemMsgType.USER_VISIBILITY_CHANGE:
      handleUserVisibility(body);
      break;
    case SystemMsgType.EXTERNAL_MEDIA_PLAYER_EVENTS:
      handleExternalMediaPlayerEvents(body);
      break;
    case SystemMsgType.POLL_CREATED:
    case SystemMsgType.POLL_CLOSED:
    case SystemMsgType.NEW_POLL_RESPONSE:
      handlePollsNotifications(body);
      break;
    case SystemMsgType.JOIN_BREAKOUT_ROOM:
      handleBreakoutRoomNotifications(body);
      break;
  }
};

const handleSendChatMsg = (mainBody: IDataMessage) => {
  const messages = chatMessagesSelector.selectAll(store.getState());
  const session = store.getState().session;
  messages
    .filter((msg) => msg.from.sid !== 'system')
    .slice(-30)
    .map(async (msg) => {
      const body = msg;
      const data: IDataMessage = {
        type: DataMessageType.USER,
        body,
        to: mainBody.body.from.userId,
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

const handleUserVisibility = (data: IDataMessage) => {
  store.dispatch(
    updateParticipant({
      id: data.body.from.userId,
      changes: {
        visibility: data.body.msg,
      },
    }),
  );
};

const handleExternalMediaPlayerEvents = (data: IDataMessage) => {
  const msg = JSON.parse(data.body.msg);
  store.dispatch(addExternalMediaPlayerAction(msg.action));
  if (typeof msg.seekTo !== 'undefined') {
    store.dispatch(externalMediaPlayerSeekTo(msg.seekTo));
  }
};

const handlePollsNotifications = (data: IDataMessage) => {
  if (data.body.type === SystemMsgType.POLL_CREATED) {
    toast(<NewPollMsg />, {
      toastId: 'info-status',
      type: 'info',
      autoClose: false,
    });
    store.dispatch(pollsApi.util.invalidateTags(['List', 'PollsStats']));
  } else if (data.body.type === SystemMsgType.NEW_POLL_RESPONSE) {
    store.dispatch(
      pollsApi.util.invalidateTags([
        { type: 'Count', id: data.body.msg },
        { type: 'PollDetails', id: data.body.msg },
      ]),
    );
  } else if (data.body.type === SystemMsgType.POLL_CLOSED) {
    store.dispatch(pollsApi.util.invalidateTags(['List', 'PollsStats']));
  }
};

const handleBreakoutRoomNotifications = (data: IDataMessage) => {
  store.dispatch(updateReceivedInvitationFor(data.body.msg));
  store.dispatch(breakoutRoomApi.util.invalidateTags(['My_Rooms']));
};
