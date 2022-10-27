// eslint-disable-next-line import/no-unresolved
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import {
  ExcalidrawImperativeAPI,
  NormalizedZoomValue,
  // eslint-disable-next-line import/no-unresolved
} from '@excalidraw/excalidraw/types/types';
import { isInvisiblySmallElement } from '@excalidraw/excalidraw';

import { participantsSelector } from '../../../store/slices/participantSlice';
import { store } from '../../../store';
import { sendWebsocketMessage } from '../../../helpers/websocket';
import { updateRequestedWhiteboardData } from '../../../store/slices/whiteboard';
import {
  BroadcastedExcalidrawElement,
  PRECEDING_ELEMENT_KEY,
} from './reconciliation';
import { IWhiteboardOfficeFile } from '../../../store/slices/interfaces/whiteboard';
import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../../../helpers/proto/plugnmeet_datamessage_pb';

const broadcastedElementVersions: Map<string, number> = new Map(),
  DELETED_ELEMENT_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours
let preScrollX = 0,
  preScrollY = 0;

export const sendRequestedForWhiteboardData = () => {
  const session = store.getState().session;
  const participants = participantsSelector
    .selectAll(store.getState())
    .filter((participant) => participant.sid !== session.currentUser?.sid);

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
    const dataMsg = new DataMessage({
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

    sendWebsocketMessage(dataMsg.toBinary());
  });
};

export const sendWhiteboardDataAsDonor = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  sendTo: string,
) => {
  // broadcast page info first
  const whiteboard = store.getState().whiteboard;
  const currentFile = whiteboard.whiteboardUploadedOfficeFiles.filter(
    (f) => f.fileId === whiteboard.currentWhiteboardOfficeFileId,
  );
  if (!currentFile.length) {
    return;
  }

  const newFile: IWhiteboardOfficeFile = {
    fileId: currentFile[0].fileId,
    fileName: currentFile[0].fileName,
    filePath: currentFile[0].filePath,
    totalPages: currentFile[0].totalPages,
    currentPage: whiteboard.currentPage,
    pageFiles: whiteboard.whiteboardOfficeFilePagesAndOtherImages,
  };

  broadcastWhiteboardOfficeFile(newFile, sendTo);

  const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
  if (elements.length) {
    broadcastSceneOnChange(elements, true, sendTo);
  }

  // finally, change status of request
  store.dispatch(
    updateRequestedWhiteboardData({
      requested: false,
      sendTo: '',
    }),
  );
};

export const isSyncableElement = (element: ExcalidrawElement) => {
  if (element.isDeleted) {
    return element.updated > Date.now() - DELETED_ELEMENT_TIMEOUT;
  }
  return !isInvisiblySmallElement(element);
};

export const broadcastSceneOnChange = (
  allElements: readonly ExcalidrawElement[],
  syncAll: boolean,
  sendTo?: string,
) => {
  // sync out only the elements we think we need to save bandwidth.
  const syncableElements = allElements.reduce(
    (acc, element: BroadcastedExcalidrawElement, idx, elements) => {
      if (
        (syncAll ||
          !broadcastedElementVersions.has(element.id) ||
          //eslint-disable-next-line
          element.version > broadcastedElementVersions.get(element.id)!) &&
        isSyncableElement(element)
      ) {
        acc.push({
          ...element,
          // z-index info for the reconciler
          [PRECEDING_ELEMENT_KEY]: idx === 0 ? '^' : elements[idx - 1]?.id,
        });
      }
      return acc;
    },
    [] as BroadcastedExcalidrawElement[],
  );

  for (const syncableElement of syncableElements) {
    broadcastedElementVersions.set(syncableElement.id, syncableElement.version);
  }

  broadcastScreenDataBySocket(syncableElements, sendTo);
};

export const broadcastScreenDataBySocket = (
  elements: readonly ExcalidrawElement[],
  sendTo?: string,
) => {
  const session = store.getState().session;
  const dataMsg = new DataMessage({
    type: DataMsgType.WHITEBOARD,
    roomSid: session.currentRoom.sid,
    roomId: session.currentRoom.room_id,
    body: {
      type: DataMsgBodyType.SCENE_UPDATE,
      from: {
        sid: session.currentUser?.sid ?? '',
        userId: session.currentUser?.userId ?? '',
      },
      msg: JSON.stringify(elements),
    },
  });

  if (sendTo && sendTo !== '') {
    dataMsg.to = sendTo;
  }

  sendWebsocketMessage(dataMsg.toBinary());
};

export const broadcastCurrentPageNumber = (page: number, sendTo?: string) => {
  const session = store.getState().session;
  const dataMsg = new DataMessage({
    type: DataMsgType.WHITEBOARD,
    roomSid: session.currentRoom.sid,
    roomId: session.currentRoom.room_id,
    body: {
      type: DataMsgBodyType.PAGE_CHANGE,
      from: {
        sid: session.currentUser?.sid ?? '',
        userId: session.currentUser?.userId ?? '',
      },
      msg: `${page}`,
    },
  });

  if (sendTo !== '') {
    dataMsg.to = sendTo;
  }

  sendWebsocketMessage(dataMsg.toBinary());
};

export const broadcastWhiteboardOfficeFile = (
  newFile: IWhiteboardOfficeFile,
  sendTo?: string,
) => {
  const session = store.getState().session;
  const dataMsg = new DataMessage({
    type: DataMsgType.WHITEBOARD,
    roomSid: session.currentRoom.sid,
    roomId: session.currentRoom.room_id,
    body: {
      type: DataMsgBodyType.ADD_WHITEBOARD_OFFICE_FILE,
      from: {
        sid: session.currentUser?.sid ?? '',
        userId: session.currentUser?.userId ?? '',
      },
      msg: JSON.stringify(newFile),
    },
  });

  if (sendTo !== '') {
    dataMsg.to = sendTo;
  }

  sendWebsocketMessage(dataMsg.toBinary());
};

export const broadcastMousePointerUpdate = (msg: any) => {
  const session = store.getState().session;
  const dataMsg = new DataMessage({
    type: DataMsgType.WHITEBOARD,
    roomSid: session.currentRoom.sid,
    roomId: session.currentRoom.room_id,
    body: {
      type: DataMsgBodyType.POINTER_UPDATE,
      from: {
        sid: session.currentUser?.sid ?? '',
        userId: session.currentUser?.userId ?? '',
      },
      msg: JSON.stringify(msg),
    },
  });

  sendWebsocketMessage(dataMsg.toBinary());
};

export const broadcastAppStateChanges = (
  height: number,
  width: number,
  scrollX: number,
  scrollY: number,
  zoomValue: NormalizedZoomValue,
  theme: string,
  viewBackgroundColor: string,
  zenModeEnabled: boolean,
  gridSize: number | null,
) => {
  if (preScrollX === scrollX && preScrollY === scrollY) {
    // if both same then we don't need to update
    return;
  } else {
    preScrollX = scrollX;
    preScrollY = scrollY;
  }

  const session = store.getState().session;
  const dataMsg = new DataMessage({
    type: DataMsgType.WHITEBOARD,
    roomSid: session.currentRoom.sid,
    roomId: session.currentRoom.room_id,
    body: {
      type: DataMsgBodyType.WHITEBOARD_APP_STATE_CHANGE,
      from: {
        sid: session.currentUser?.sid ?? '',
        userId: session.currentUser?.userId ?? '',
      },
      msg: JSON.stringify({
        height,
        width,
        scrollX,
        scrollY,
        zoomValue,
        theme,
        viewBackgroundColor,
        zenModeEnabled,
        gridSize,
      }),
    },
  });

  sendWebsocketMessage(dataMsg.toBinary());
};
