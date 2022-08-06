import { participantsSelector } from '../../store/slices/participantSlice';
import { store } from '../../store';
import { sendWebsocketMessage } from './index';
import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../proto/plugnmeet_datamessage_pb';

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
  // send initial chat messages
  const dataMsg = new DataMessage({
    type: DataMsgType.SYSTEM,
    roomSid: session.currentRoom.sid,
    roomId: session.currentRoom.room_id,
    to: donor.sid,
    body: {
      type: DataMsgBodyType.SEND_CHAT_MSGS,
      from: {
        sid: session.currentUser?.sid ?? '',
        userId: session.currentUser?.userId ?? '',
      },
      msg: '',
    },
  });

  sendWebsocketMessage(dataMsg.toBinary());

  // send initial whiteboard elements
  // this is also helpful if user got reconnect
  const whiteboardElms = new DataMessage({
    type: DataMsgType.SYSTEM,
    roomSid: session.currentRoom.sid,
    roomId: session.currentRoom.room_id,
    to: donor.sid,
    body: {
      type: DataMsgBodyType.INIT_WHITEBOARD,
      from: {
        sid: session.currentUser?.sid ?? '',
        userId: session.currentUser?.userId ?? '',
      },
      msg: '',
    },
  });

  sendWebsocketMessage(whiteboardElms.toBinary());
};
