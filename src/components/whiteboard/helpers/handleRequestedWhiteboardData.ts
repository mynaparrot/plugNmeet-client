// eslint-disable-next-line import/no-unresolved
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

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
import { updateRequestedWhiteboardData } from '../../../store/slices/whiteboard';
import { BroadcastedExcalidrawElement } from './reconciliation';

const broadcastedElementVersions: Map<string, number> = new Map();

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
    sendScreenDataBySocket(elements, sendTo);
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

export const broadcastSceneOnChange = (
  allElements: readonly ExcalidrawElement[],
) => {
  // sync out only the elements we think we need to to save bandwidth.
  const syncableElements = allElements.reduce(
    (acc, element: BroadcastedExcalidrawElement, idx, elements) => {
      if (
        !broadcastedElementVersions.has(element.id) ||
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        element.version > broadcastedElementVersions.get(element.id)!
      ) {
        acc.push({
          ...element,
          // z-index info for the reconciler
          parent: idx === 0 ? '^' : elements[idx - 1]?.id,
        });
      }
      return acc;
    },
    [] as BroadcastedExcalidrawElement[],
  );

  sendScreenDataBySocket(syncableElements, '');

  for (const syncableElement of syncableElements) {
    broadcastedElementVersions.set(syncableElement.id, syncableElement.version);
  }
};

export const sendScreenDataBySocket = (
  elements: readonly ExcalidrawElement[],
  sendTo: string,
) => {
  const session = store.getState().session;
  const from = {
    sid: session.currenUser?.sid ?? '',
    userId: session.currenUser?.userId ?? '',
  };

  const msg = JSON.stringify(elements);

  const info: WhiteboardMsg = {
    type: WhiteboardMsgType.SCENE_UPDATE,
    from,
    msg: msg,
  };

  const data: IDataMessage = {
    type: DataMessageType.WHITEBOARD,
    room_sid: session.currentRoom.sid,
    room_id: session.currentRoom.room_id,
    message_id: '',
    body: info,
  };

  if (sendTo !== '') {
    data.to = sendTo;
  }

  sendWebsocketMessage(JSON.stringify(data));
};
