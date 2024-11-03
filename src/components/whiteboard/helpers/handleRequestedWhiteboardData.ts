import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import {
  ExcalidrawImperativeAPI,
  NormalizedZoomValue,
} from '@excalidraw/excalidraw/types/types';
import { isInvisiblySmallElement } from '@excalidraw/excalidraw';
import { toast } from 'react-toastify';
import {
  DataMsgBodyType,
  AnalyticsEvents,
  AnalyticsEventType,
} from 'plugnmeet-protocol-js';

import { store } from '../../../store';
import { updateRequestedWhiteboardData } from '../../../store/slices/whiteboard';
import {
  BroadcastedExcalidrawElement,
  PRECEDING_ELEMENT_KEY,
} from './reconciliation';
import { IWhiteboardOfficeFile } from '../../../store/slices/interfaces/whiteboard';
import { encryptMessage } from '../../../helpers/cryptoMessages';
import { getNatsConn } from '../../../helpers/nats';
import ConnectNats from '../../../helpers/nats/ConnectNats';
import { getWhiteboardDonors } from '../../../helpers/utils';

const broadcastedElementVersions: Map<string, number> = new Map(),
  DELETED_ELEMENT_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours
let preScrollX = 0,
  preScrollY = 0,
  conn: ConnectNats;

export const sendRequestedForWhiteboardData = async () => {
  if (!conn) {
    conn = getNatsConn();
  }
  const donors = getWhiteboardDonors();
  for (let i = 0; i < donors.length; i++) {
    conn.sendDataMessage(
      DataMsgBodyType.REQ_FULL_WHITEBOARD_DATA,
      '',
      donors[i].userId,
    );
  }
};

export const sendWhiteboardDataAsDonor = async (
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

  await broadcastWhiteboardOfficeFile(newFile, sendTo);

  const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
  if (elements.length) {
    const data = JSON.stringify(elements);
    conn.sendDataMessage(
      DataMsgBodyType.RES_FULL_WHITEBOARD_DATA,
      data,
      sendTo,
    );
  }

  // finally, change the status of request
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

export const broadcastSceneOnChange = async (
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

  await broadcastScreenDataBySocket(syncableElements, sendTo);
};

export const broadcastScreenDataBySocket = async (
  elements: readonly ExcalidrawElement[],
  sendTo?: string,
) => {
  //const session = store.getState().session;
  const finalMsg = await handleEncryption(JSON.stringify(elements));
  if (typeof finalMsg === 'undefined') {
    return;
  }
  if (!conn) {
    conn = getNatsConn();
  }
  conn.sendWhiteboardData(DataMsgBodyType.SCENE_UPDATE, finalMsg, sendTo);
  conn.sendAnalyticsData(
    AnalyticsEvents.ANALYTICS_EVENT_USER_WHITEBOARD_ANNOTATED,
    AnalyticsEventType.USER,
    '',
    '',
    '1',
  );
};

export const broadcastCurrentPageNumber = async (
  page: number,
  sendTo?: string,
) => {
  if (!conn) {
    conn = getNatsConn();
  }
  conn.sendWhiteboardData(DataMsgBodyType.PAGE_CHANGE, `${page}`, sendTo);
};

export const broadcastWhiteboardOfficeFile = async (
  newFile: IWhiteboardOfficeFile,
  sendTo?: string,
) => {
  if (!conn) {
    conn = getNatsConn();
  }
  conn.sendWhiteboardData(
    DataMsgBodyType.ADD_WHITEBOARD_OFFICE_FILE,
    JSON.stringify(newFile),
    sendTo,
  );
};

export const broadcastMousePointerUpdate = async (element: any) => {
  const finalMsg = await handleEncryption(JSON.stringify(element));
  if (typeof finalMsg === 'undefined') {
    return;
  }

  if (!conn) {
    conn = getNatsConn();
  }
  conn.sendWhiteboardData(DataMsgBodyType.POINTER_UPDATE, finalMsg);
};

export const broadcastAppStateChanges = async (
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

  const finalMsg = JSON.stringify({
    height,
    width,
    scrollX,
    scrollY,
    zoomValue,
    theme,
    viewBackgroundColor,
    zenModeEnabled,
    gridSize,
  });

  if (!conn) {
    conn = getNatsConn();
  }
  conn.sendWhiteboardData(
    DataMsgBodyType.WHITEBOARD_APP_STATE_CHANGE,
    finalMsg,
  );
};

let isEnabledE2EE: boolean | undefined = undefined;
const handleEncryption = async (msg: string) => {
  if (typeof isEnabledE2EE === 'undefined') {
    const e2ee =
      store.getState().session.currentRoom.metadata?.roomFeatures
        ?.endToEndEncryptionFeatures;
    isEnabledE2EE = !!(
      e2ee &&
      e2ee.isEnabled &&
      e2ee.includedWhiteboard &&
      e2ee.encryptionKey
    );
  }

  if (isEnabledE2EE) {
    try {
      return await encryptMessage(msg);
    } catch (e: any) {
      toast('Encryption error: ' + e.message, {
        type: 'error',
      });
      console.error('Encryption error:' + e.message);
      return undefined;
    }
  }

  return msg;
};
