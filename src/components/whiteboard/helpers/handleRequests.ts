import { NormalizedZoomValue } from '@excalidraw/excalidraw/types';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';
import { isEqual } from 'es-toolkit';

import { getNatsConn } from '../../../helpers/nats';
import ConnectNats from '../../../helpers/nats/ConnectNats';

let preAppState: Record<string, any> | null = null,
  conn: ConnectNats;

export const broadcastCurrentPageNumber = async (
  page: number,
  sendTo?: string,
) => {
  if (!conn) {
    conn = getNatsConn();
  }
  await conn.sendWhiteboardData(DataMsgBodyType.PAGE_CHANGE, {
    message: `${page}`,
    to: sendTo,
  });
};

export const broadcastCurrentFileId = async (
  fileId: string,
  page: number,
  sendTo?: string,
) => {
  if (!conn) {
    conn = getNatsConn();
  }
  await conn.sendWhiteboardData(DataMsgBodyType.FILE_CHANGE, {
    message: JSON.stringify({ fileId, page }),
    to: sendTo,
  });
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
    {
      message: pages,
      to: sendTo,
    },
  );
};

export const broadcastMousePointerUpdate = async (element: any) => {
  if (!conn) {
    conn = getNatsConn();
  }
  await conn.sendWhiteboardData(DataMsgBodyType.POINTER_UPDATE, {
    message: JSON.stringify(element),
  });
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
  await conn.sendWhiteboardData(DataMsgBodyType.WHITEBOARD_APP_STATE_CHANGE, {
    message: finalMsg,
  });
};
