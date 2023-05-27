import React from 'react';
import { toast } from 'react-toastify';

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
import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../proto/plugnmeet_datamessage_pb';
import { SpeechTextBroadcastFormat } from '../../store/slices/interfaces/speechServices';
import { addSpeechSubtitleText } from '../../store/slices/speechServicesSlice';

export const handleSystemTypeData = (body: DataMessage) => {
  switch (body.body?.type) {
    // got request to send previous chat messages. We'll send last 30 messages
    case DataMsgBodyType.SEND_CHAT_MSGS:
      handleSendChatMsg(body);
      break;
    case DataMsgBodyType.INIT_WHITEBOARD:
      handleSendInitWhiteboard(body);
      break;
    case DataMsgBodyType.RENEW_TOKEN:
      handleRenewToken(body);
      break;
    case DataMsgBodyType.INFO:
    case DataMsgBodyType.ALERT:
      handlePushMsgMsg(body);
      break;
    case DataMsgBodyType.USER_VISIBILITY_CHANGE:
      handleUserVisibility(body);
      break;
    case DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS:
      handleExternalMediaPlayerEvents(body);
      break;
    case DataMsgBodyType.POLL_CREATED:
    case DataMsgBodyType.POLL_CLOSED:
    case DataMsgBodyType.NEW_POLL_RESPONSE:
      handlePollsNotifications(body);
      break;
    case DataMsgBodyType.JOIN_BREAKOUT_ROOM:
      handleBreakoutRoomNotifications(body);
      break;
    case DataMsgBodyType.SPEECH_SUBTITLE_TEXT:
      handleSpeechSubtitleText(body);
      break;
  }
};

const handleSendChatMsg = (mainBody: DataMessage) => {
  const messages = chatMessagesSelector.selectAll(store.getState());
  const session = store.getState().session;
  messages
    .filter((msg) => msg.from.sid !== 'system')
    .slice(-30)
    .map(async (msg) => {
      const dataMsg: DataMessage = new DataMessage({
        type: DataMsgType.USER,
        to: mainBody.body?.from?.userId,
        roomId: session.currentRoom.room_id,
        roomSid: session.currentRoom.sid,
        messageId: '',
        body: {
          type: DataMsgBodyType.CHAT,
          messageId: msg.message_id,
          time: msg.time,
          from: {
            sid: msg.from.sid,
            userId: msg.from.userId,
            name: msg.from.name,
          },
          msg: msg.msg,
          isPrivate: msg.isPrivate ? 1 : 0,
        },
      });

      sendWebsocketMessage(dataMsg.toBinary());
    });
};

const handleSendInitWhiteboard = (mainBody: DataMessage) => {
  if (store.getState().whiteboard.requestedWhiteboardData.requested) {
    // already have one request
    return;
  }
  // we'll update reducer only
  // component will take care for sending data
  store.dispatch(
    updateRequestedWhiteboardData({
      requested: true,
      sendTo: mainBody.body?.from?.sid ?? '',
    }),
  );
};

const handleRenewToken = (mainBody: DataMessage) => {
  store.dispatch(addToken(mainBody.body?.msg ?? ''));
};

const handlePushMsgMsg = (mainBody: DataMessage) => {
  switch (mainBody.body?.type) {
    case DataMsgBodyType.INFO:
      toast(mainBody.body.msg, {
        toastId: 'info-status',
        type: 'info',
      });
      break;
    case DataMsgBodyType.ALERT:
      toast(mainBody.body.msg, {
        toastId: 'alert-status',
        type: 'warning',
      });
      break;
  }
};

const handleUserVisibility = (data: DataMessage) => {
  store.dispatch(
    updateParticipant({
      id: data.body?.from?.userId ?? '',
      changes: {
        visibility: data.body?.msg,
      },
    }),
  );
};

const handleExternalMediaPlayerEvents = (data: DataMessage) => {
  if (!data.body) {
    return;
  }
  const msg = JSON.parse(data.body.msg);
  store.dispatch(addExternalMediaPlayerAction(msg.action));
  if (typeof msg.seekTo !== 'undefined') {
    store.dispatch(externalMediaPlayerSeekTo(msg.seekTo));
  }
};

const handlePollsNotifications = (data: DataMessage) => {
  // for recorder don't need to show anything
  if (store.getState().session.currentUser?.isRecorder) {
    return;
  }
  if (data.body?.type === DataMsgBodyType.POLL_CREATED) {
    toast(<NewPollMsg />, {
      toastId: 'info-status',
      type: 'info',
      autoClose: false,
    });
    store.dispatch(pollsApi.util.invalidateTags(['List', 'PollsStats']));
  } else if (data.body?.type === DataMsgBodyType.NEW_POLL_RESPONSE) {
    store.dispatch(
      pollsApi.util.invalidateTags([
        { type: 'Count', id: data.body.msg },
        { type: 'PollDetails', id: data.body.msg },
      ]),
    );
  } else if (data.body?.type === DataMsgBodyType.POLL_CLOSED) {
    store.dispatch(pollsApi.util.invalidateTags(['List', 'PollsStats']));
  }
};

const handleBreakoutRoomNotifications = (data: DataMessage) => {
  if (!data.body) {
    return;
  }
  store.dispatch(updateReceivedInvitationFor(data.body.msg));
  store.dispatch(breakoutRoomApi.util.invalidateTags(['My_Rooms']));
};

const handleSpeechSubtitleText = (data: DataMessage) => {
  if (!data.body) {
    return;
  }
  const msg: SpeechTextBroadcastFormat = JSON.parse(data.body.msg);
  const lang = store.getState().speechServices.selectedSubtitleLang;

  if (lang !== '' && typeof msg.result[lang] !== 'undefined') {
    const d = new Date(data.body.time ?? '');
    store.dispatch(
      addSpeechSubtitleText({
        type: msg.type,
        result: {
          text: msg.result[lang],
          from: msg.from,
          time: d.toLocaleTimeString(),
          id: data.messageId ?? d.getUTCMilliseconds().toString(),
        },
      }),
    );
  }
};
