import { participantsSelector } from '../../store/slices/participantSlice';
import { store } from '../../store';
import {
  DataMessageType,
  IDataMessage,
  SystemMsgType,
} from '../../store/slices/interfaces/dataMessages';
import { sendWebsocketMessage } from './index';

export const onAfterOpenConnection = () => {
  const session = store.getState().session;
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
