import { participantsSelector } from '../../store/slices/participantSlice';
import { store } from '../../store';
import { sendWebsocketMessage } from './index';
import {
  DataMessage,
  DataMsgBody,
  DataMsgBodyType,
  DataMsgType,
} from '../proto/plugnmeet_datamessage';

export const onAfterOpenConnection = () => {
  const session = store.getState().session;
  const participants = participantsSelector
    .selectAll(store.getState())
    .filter((participant) => participant.sid !== session.currentUser?.sid);

  if (!participants.length) return;

  participants.sort((a, b) => {
    return a.joinedAt - b.joinedAt;
  });

  const donor = participants[0];
  console.log(donor);

  // send initial chat messages
  const body: DataMsgBody = {
    type: DataMsgBodyType.SEND_CHAT_MSGS,
    isPrivate: false,
    from: {
      sid: session.currentUser?.sid ?? '',
      userId: session.currentUser?.userId ?? '',
    },
    msg: '',
  };

  const dataMsg: DataMessage = {
    type: DataMsgType.SYSTEM,
    roomSid: session.currentRoom.sid,
    roomId: session.currentRoom.room_id,
    to: donor.sid,
    body: body,
  };

  sendWebsocketMessage(DataMessage.encode(dataMsg).finish());

  // send initial whiteboard elements
  // this is also helpful if user got reconnect
  const whiteboardBody: DataMsgBody = {
    type: DataMsgBodyType.INIT_WHITEBOARD,
    isPrivate: false,
    from: {
      sid: session.currentUser?.sid ?? '',
      userId: session.currentUser?.userId ?? '',
    },
    msg: '',
  };

  const whiteboardElms: DataMessage = {
    type: DataMsgType.SYSTEM,
    roomSid: session.currentRoom.sid,
    roomId: session.currentRoom.room_id,
    to: donor.sid,
    body: whiteboardBody,
  };

  sendWebsocketMessage(DataMessage.encode(whiteboardElms).finish());
};
