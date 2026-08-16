import { NormalizedZoomValue } from '@excalidraw/excalidraw/types';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';
import { isEqual } from 'es-toolkit';

import { getNatsConn } from '../../../helpers/nats';
import ConnectNats from '../../../helpers/nats/ConnectNats';

let preAppState: Record<string, any> | null = null,
  conn: ConnectNats;
let positionRequestResolver:
  ((position: { fileId: string; page: number } | null) => void) | null = null;
let positionRequestTimer: ReturnType<typeof setTimeout> | null = null;

export const requestCurrentWhiteboardPosition = (): Promise<{
  fileId: string;
  page: number;
} | null> => {
  if (!conn) {
    conn = getNatsConn();
  }
  return new Promise((resolve) => {
    if (positionRequestResolver) {
      positionRequestResolver(null);
    }
    positionRequestResolver = resolve;

    if (positionRequestTimer) {
      clearTimeout(positionRequestTimer);
    }
    positionRequestTimer = setTimeout(() => {
      positionRequestResolver?.(null);
      positionRequestResolver = null;
      positionRequestTimer = null;
    }, 2000);

    void conn.sendWhiteboardData(
      DataMsgBodyType.REQ_FULL_WHITEBOARD_DATA,
      JSON.stringify({ action: 'position-request' }),
    );
  });
};

export const resolveWhiteboardPositionResponse = (
  fileId: string,
  page: number,
) => {
  if (positionRequestResolver) {
    positionRequestResolver({ fileId, page });
    positionRequestResolver = null;
  }
  if (positionRequestTimer) {
    clearTimeout(positionRequestTimer);
    positionRequestTimer = null;
  }
};

export const sendWhiteboardPositionResponse = async (
  fileId: string,
  page: number,
) => {
  if (!conn) {
    conn = getNatsConn();
  }
  await conn.sendWhiteboardData(
    DataMsgBodyType.RES_FULL_WHITEBOARD_DATA,
    JSON.stringify({ action: 'position-response', fileId, page }),
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
  const currentAppState = {
    height,
    width,
    scrollX,
    scrollY,
    zoomValue,
    theme,
    viewBackgroundColor,
    zenModeEnabled,
    gridSize,
  };

  if (preAppState && isEqual(preAppState, currentAppState)) {
    return;
  }

  preAppState = currentAppState;
  const finalMsg = JSON.stringify(currentAppState);

  if (!conn) {
    conn = getNatsConn();
  }
  await conn.sendWhiteboardData(
    DataMsgBodyType.WHITEBOARD_APP_STATE_CHANGE,
    finalMsg,
  );
};
