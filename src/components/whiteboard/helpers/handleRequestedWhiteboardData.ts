import {
  BinaryFiles,
  ExcalidrawImperativeAPI,
  NormalizedZoomValue,
} from '@excalidraw/excalidraw/types';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { isInvisiblySmallElement } from '@excalidraw/excalidraw';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  DataMsgBodyType,
} from 'plugnmeet-protocol-js';

import { store } from '../../../store';
import { updateRequestedWhiteboardData } from '../../../store/slices/whiteboard';
import { encryptMessage } from '../../../helpers/libs/cryptoMessages';
import { getNatsConn } from '../../../helpers/nats';
import ConnectNats from '../../../helpers/nats/ConnectNats';
import { getWhiteboardDonors } from '../../../helpers/utils';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import { uploadCanvasBinaryFile } from './handleFiles';

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
  const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
  if (elements.length) {
    const data = JSON.stringify(elements);
    conn.sendDataMessage(
      DataMsgBodyType.RES_FULL_WHITEBOARD_DATA,
      data,
      sendTo,
    );
  }
  const currentOfficeFilePages =
    store.getState().whiteboard.currentOfficeFilePages;
  if (currentOfficeFilePages !== '') {
    broadcastCurrentOfficeFilePages(currentOfficeFilePages);
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
  excalidrawAPI?: ExcalidrawImperativeAPI,
  files?: BinaryFiles,
) => {
  if (syncAll) {
    broadcastedElementVersions.clear();
  }

  // sync out only the elements we think we need to save bandwidth.
  const syncableElements = allElements.reduce((acc, element) => {
    if (
      (syncAll ||
        !broadcastedElementVersions.has(element.id) ||
        element.version > broadcastedElementVersions.get(element.id)!) &&
      isSyncableElement(element)
    ) {
      acc.push(element);
    }
    return acc;
  }, [] as ExcalidrawElement[]);

  if (!syncableElements.length) {
    return;
  }

  const elementsToBroadcast: ExcalidrawElement[] = [];
  for (const elm of syncableElements) {
    if (elm.type === 'image' && elm.status === 'pending') {
      // This is a new image. We need to upload its data first.
      // The `files` object contains the binary data for elements on the canvas.
      const fileData = elm.fileId && files?.[elm.fileId];

      if (fileData) {
        // We found the data. Let's upload it.
        // The `uploadCanvasBinaryFile` function will handle broadcasting
        // the 'saved' status of the element once the upload is complete.
        uploadCanvasBinaryFile(elm, fileData, excalidrawAPI).then();
      }
      // We must record the version of the pending element so that when it
      // becomes "saved", the version bump is detected.
      broadcastedElementVersions.set(elm.id, elm.version);
      // We don't broadcast the 'pending' element itself. We wait for the
      // upload to finish and broadcast the 'saved' element then.
      continue;
    }

    // For all other elements, we add them to the broadcast list.
    broadcastedElementVersions.set(elm.id, elm.version);
    elementsToBroadcast.push(elm);
  }

  if (!elementsToBroadcast.length) {
    return;
  }

  await broadcastScreenDataByNats(elementsToBroadcast, sendTo);
};

export const broadcastScreenDataByNats = async (
  elements: readonly ExcalidrawElement[],
  sendTo?: string,
) => {
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

export const broadcastCurrentFileId = async (
  fileId: string,
  sendTo?: string,
) => {
  if (!conn) {
    conn = getNatsConn();
  }
  conn.sendWhiteboardData(DataMsgBodyType.FILE_CHANGE, fileId, sendTo);
};

/*
 * broadcastCurrentOfficeFilePages will send current office file pages
 * this will help other participants to download preloaded file
 * there is no other reason as reconcileAndUpdateScene will track images anyway
 */
export const broadcastCurrentOfficeFilePages = (
  pages: string,
  sendTo?: string,
) => {
  if (!conn) {
    conn = getNatsConn();
  }
  conn.sendWhiteboardData(
    DataMsgBodyType.UPDATE_CURRENT_OFFICE_FILE_PAGES,
    pages,
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
    isEnabledE2EE = !!(e2ee && e2ee.isEnabled && e2ee.includedWhiteboard);
  }

  if (isEnabledE2EE) {
    try {
      return await encryptMessage(msg);
    } catch (e: any) {
      store.dispatch(
        addUserNotification({
          message: 'Encryption error: ' + e.message,
          typeOption: 'error',
        }),
      );
      console.error('Encryption error:' + e.message);
      return undefined;
    }
  }

  return msg;
};
