import {
  BinaryFileData,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  NormalizedZoomValue,
} from '@excalidraw/excalidraw/types';
import {
  ExcalidrawElement,
  ExcalidrawImageElement,
} from '@excalidraw/excalidraw/element/types';
import { isInvisiblySmallElement } from '@excalidraw/excalidraw';
import {
  DataMsgBodyType,
  AnalyticsEvents,
  AnalyticsEventType,
} from 'plugnmeet-protocol-js';

import { store } from '../../../store';
import {
  addWhiteboardOtherImageFile,
  updateRequestedWhiteboardData,
} from '../../../store/slices/whiteboard';
import {
  IWhiteboardFile,
  IWhiteboardOfficeFile,
} from '../../../store/slices/interfaces/whiteboard';
import { encryptMessage } from '../../../helpers/libs/cryptoMessages';
import { getNatsConn } from '../../../helpers/nats';
import ConnectNats from '../../../helpers/nats/ConnectNats';
import {
  getWhiteboardDonors,
  uploadBase64EncodedFile,
} from '../../../helpers/utils';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';

const broadcastedElementVersions: Map<string, number> = new Map(),
  DELETED_ELEMENT_TIMEOUT = 3 * 60 * 60 * 1000,
  uploadingCanvasBinaryFile: Map<string, string> = new Map(); // 3 hours
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
  excalidrawAPI?: ExcalidrawImperativeAPI,
  currentPage?: number,
  files?: BinaryFiles,
) => {
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
  for (let i = 0; i < syncableElements.length; i++) {
    const elm = syncableElements[i];
    let toAdd = true;
    if (elm.type === 'image' && elm.status === 'pending') {
      if (!files) {
        // this mean the file wasn't ready yet
        continue;
      }
      let fileFound = false;
      for (const canvasFile in files) {
        const file = files[canvasFile];
        if (file.id === elm.fileId) {
          fileFound = true;
          // we'll upload the file first then publish this
          // otherwise other user will receive a blank element
          uploadCanvasBinaryFile(
            currentPage ?? 1,
            elm,
            file,
            excalidrawAPI,
          ).then();
          // no need to add until we're ready
          toAdd = false;
          break;
        }
      }
      if (!fileFound) {
        // if no file found then we won't add
        // because maybe the file isn't ready yet.
        toAdd = false;
      }
    }

    if (toAdd) {
      broadcastedElementVersions.set(elm.id, elm.version);
      elementsToBroadcast.push(elm);
    }
  }

  if (!elementsToBroadcast.length) {
    return;
  }

  await broadcastScreenDataBySocket(elementsToBroadcast, sendTo);
};

const uploadCanvasBinaryFile = async (
  currentPage: number,
  elm: ExcalidrawImageElement,
  file: BinaryFileData,
  excalidrawAPI?: ExcalidrawImperativeAPI,
) => {
  if (uploadingCanvasBinaryFile.has(file.id)) {
    return;
  }

  // add in queue
  uploadingCanvasBinaryFile.set(file.id, elm.id);
  const res = await uploadBase64EncodedFile(`${file.id}.png`, file.dataURL);
  if (!res || !res.status) {
    return;
  }

  const localElements = excalidrawAPI?.getSceneElementsIncludingDeleted();
  const newElms: ExcalidrawElement[] = [];
  let thisElm: any = undefined;
  localElements?.forEach((el) => {
    if (el.id === elm.id && el.type === 'image') {
      thisElm = structuredClone(el);
      thisElm.status = 'saved';
      newElms.push(thisElm);
    } else {
      newElms.push(el);
    }
  });

  const fileToSend: IWhiteboardFile = {
    id: file.id,
    currentPage,
    filePath: res.filePath,
    fileName: res.fileName,
    isOfficeFile: false,
    uploaderWhiteboardHeight: excalidrawAPI?.getAppState().height ?? 100,
    uploaderWhiteboardWidth: excalidrawAPI?.getAppState().width ?? 100,
    excalidrawElement: thisElm,
  };

  store.dispatch(addWhiteboardOtherImageFile(fileToSend));
  const files =
    store.getState().whiteboard.whiteboardOfficeFilePagesAndOtherImages;
  conn.sendWhiteboardData(DataMsgBodyType.ADD_WHITEBOARD_FILE, files);

  // finally update screen
  excalidrawAPI?.updateScene({
    elements: newElms,
  });

  uploadingCanvasBinaryFile.delete(file.id);
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
