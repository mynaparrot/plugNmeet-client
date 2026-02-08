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
import { getNatsConn } from '../../../helpers/nats';
import ConnectNats from '../../../helpers/nats/ConnectNats';
import { getWhiteboardDonors } from '../../../helpers/utils';
import { uploadCanvasBinaryFile } from './handleFiles';
import { WhiteboardDataAsDonorData } from '../../../store/slices/interfaces/whiteboard';

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
    await conn.sendDataMessage(
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
  if (!conn) {
    conn = getNatsConn();
  }

  const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
  if (elements.length) {
    const {
      currentOfficeFilePages,
      currentWhiteboardOfficeFileId,
      currentPage,
    } = store.getState().whiteboard;
    const appState = excalidrawAPI.getAppState();

    const data: WhiteboardDataAsDonorData = {
      currentOfficeFilePages: currentOfficeFilePages,
      currentPageNumber: currentPage,
      currentWhiteboardOfficeFileId: currentWhiteboardOfficeFileId,
      elements,
      appState: {
        height: appState.height,
        width: appState.width,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoomValue: appState.zoom.value,
        theme: appState.theme,
        viewBackgroundColor: appState.viewBackgroundColor,
        zenModeEnabled: appState.zenModeEnabled,
        gridSize: appState.gridSize,
      },
    };

    await conn.sendDataMessage(
      DataMsgBodyType.RES_FULL_WHITEBOARD_DATA,
      JSON.stringify(data),
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
  excalidrawAPI?: ExcalidrawImperativeAPI,
  files?: BinaryFiles,
) => {
  if (syncAll) {
    broadcastedElementVersions.clear();
  }

  // To save bandwidth, we only broadcast elements that have changed.
  // We maintain a map (`broadcastedElementVersions`) that acts as this client's "memory",
  // storing the `version` of each element the last time we sent it.
  //
  // This filter then selects an element only if:
  // 1. A full sync is forced via `syncAll` (which clears the memory map for a fresh start).
  // 2. It's NEW (not in our memory map).
  // 3. It's UPDATED (its version is higher than the one in our memory map).
  // This ensures we only broadcast a small "diff" of changes, not the entire scene.
  const syncableElements = allElements.filter(
    (element) =>
      (syncAll ||
        !broadcastedElementVersions.has(element.id) ||
        element.version > broadcastedElementVersions.get(element.id)!) &&
      isSyncableElement(element),
  );

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
  if (!conn) {
    conn = getNatsConn();
  }
  await conn.sendWhiteboardData(
    DataMsgBodyType.SCENE_UPDATE,
    JSON.stringify(elements),
    sendTo,
  );
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
  await conn.sendWhiteboardData(DataMsgBodyType.PAGE_CHANGE, `${page}`, sendTo);
};

export const broadcastCurrentFileId = async (
  fileId: string,
  sendTo?: string,
) => {
  if (!conn) {
    conn = getNatsConn();
  }
  await conn.sendWhiteboardData(DataMsgBodyType.FILE_CHANGE, fileId, sendTo);
};

/*
 * broadcastCurrentOfficeFilePages will send current office file pages
 * this will help other participants to download preloaded file
 * there is no other reason as reconcileAndUpdateScene will track images anyway
 */
export const broadcastCurrentOfficeFilePages = async (
  pages: string,
  sendTo?: string,
) => {
  if (!conn) {
    conn = getNatsConn();
  }
  await conn.sendWhiteboardData(
    DataMsgBodyType.UPDATE_CURRENT_OFFICE_FILE_PAGES,
    pages,
    sendTo,
  );
};

export const broadcastMousePointerUpdate = async (element: any) => {
  if (!conn) {
    conn = getNatsConn();
  }
  await conn.sendWhiteboardData(
    DataMsgBodyType.POINTER_UPDATE,
    JSON.stringify(element),
  );
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
  await conn.sendWhiteboardData(
    DataMsgBodyType.WHITEBOARD_APP_STATE_CHANGE,
    finalMsg,
  );
};

export const sendClearWhiteboardSignal = async () => {
  if (!conn) {
    conn = getNatsConn();
  }
  await conn.sendWhiteboardData(DataMsgBodyType.WHITEBOARD_RESET, '');
};
