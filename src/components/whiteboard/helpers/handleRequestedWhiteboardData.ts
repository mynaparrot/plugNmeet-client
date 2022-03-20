import { participantsSelector } from '../../../store/slices/participantSlice';
import { store } from '../../../store';
import {
  DataMessageType,
  IDataMessage,
  SystemMsgType,
  WhiteboardMsg,
  WhiteboardMsgType,
} from '../../../store/slices/interfaces/dataMessages';
import { sendWebsocketMessage } from '../../../helpers/websocketConnector';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { updateRequestedWhiteboardData } from '../../../store/slices/whiteboard';

export const sendRequestedForWhiteboardData = () => {
  const session = store.getState().session;
  const participants = participantsSelector
    .selectAll(store.getState())
    .filter((participant) => participant.sid !== session.currenUser?.sid);

  if (!participants.length) return;

  participants.sort((a, b) => {
    return a.joinedAt - b.joinedAt;
  });

  let donors = participants;
  if (donors.length > 2) {
    // we'll request data from max 2 users.
    donors = participants.slice(0, 2);
  }

  donors.forEach((donor) => {
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

    setTimeout(() => {
      sendWebsocketMessage(JSON.stringify(whiteboardElms));
    }, 500);
  });
};

export const sendWhiteboardData = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  sendTo: string,
) => {
  const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
  const session = store.getState().session;
  const from = {
    sid: session.currenUser?.sid ?? '',
    userId: session.currenUser?.userId ?? '',
  };

  if (elements.length) {
    const info: WhiteboardMsg = {
      type: WhiteboardMsgType.SCENE_UPDATE,
      from,
      msg: JSON.stringify(elements),
    };

    const data: IDataMessage = {
      type: DataMessageType.WHITEBOARD,
      room_sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
      message_id: '',
      body: info,
      to: sendTo,
    };

    sendWebsocketMessage(JSON.stringify(data));
  }

  // send whiteboard files
  const files = store.getState().whiteboard.whiteboardFiles;
  if (files) {
    const info: WhiteboardMsg = {
      type: WhiteboardMsgType.ADD_WHITEBOARD_FILE,
      from,
      msg: files,
    };

    const data: IDataMessage = {
      type: DataMessageType.WHITEBOARD,
      room_sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
      message_id: '',
      body: info,
      to: sendTo,
    };

    sendWebsocketMessage(JSON.stringify(data));
  }

  // finally, change status
  store.dispatch(
    updateRequestedWhiteboardData({
      requested: false,
      sendTo: '',
    }),
  );
};
