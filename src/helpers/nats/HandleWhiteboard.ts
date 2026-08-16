import { DataChannelMessage, DataMsgBodyType } from 'plugnmeet-protocol-js';

import { store } from '../../store';
import { getWhiteboardController } from '../../components/whiteboard/collab';
import {
  resolveWhiteboardPositionResponse,
  sendWhiteboardPositionResponse,
} from '../../components/whiteboard/helpers/handleRequests';
import {
  setWhiteboardCurrentPage,
  updateCurrentOfficeFilePages,
  updateCurrentWhiteboardOfficeFileId,
  updateMouseAppStateChanges,
  updateMousePointerLocation,
} from '../../store/slices/whiteboard';

export default class HandleWhiteboard {
  public handleWhiteboardMsg = async (payload: DataChannelMessage) => {
    switch (payload.type) {
      case DataMsgBodyType.SCENE_UPDATE:
        if (payload.binMessage && payload.binMessage.length > 0) {
          getWhiteboardController().handleMessage(
            payload.type,
            payload.binMessage,
            payload.fromUserId,
            payload.id,
            payload.message,
          );
        }
        break;
      case DataMsgBodyType.REQ_FULL_WHITEBOARD_DATA:
        if (payload.binMessage && payload.binMessage.length > 0) {
          getWhiteboardController().handleMessage(
            payload.type,
            payload.binMessage,
            payload.fromUserId,
            payload.id,
            payload.message,
          );
        } else if (this.isCurrentUserPresenter()) {
          const { currentWhiteboardOfficeFileId, currentPage } =
            store.getState().whiteboard;
          void sendWhiteboardPositionResponse(
            currentWhiteboardOfficeFileId,
            currentPage,
          );
        }
        break;
      case DataMsgBodyType.RES_FULL_WHITEBOARD_DATA:
        if (payload.binMessage && payload.binMessage.length > 0) {
          getWhiteboardController().handleMessage(
            payload.type,
            payload.binMessage,
            payload.fromUserId,
            payload.id,
            payload.message,
          );
        } else {
          try {
            const msg = JSON.parse(payload.message) as {
              action?: string;
              fileId?: string;
              page?: number;
            };
            if (
              msg.action === 'position-response' &&
              typeof msg.fileId === 'string' &&
              typeof msg.page === 'number'
            ) {
              resolveWhiteboardPositionResponse(msg.fileId, msg.page);
            }
          } catch {
            // ignore malformed position response
          }
        }
        break;
      case DataMsgBodyType.POINTER_UPDATE:
        store.dispatch(updateMousePointerLocation(payload.message));
        break;
      case DataMsgBodyType.PAGE_CHANGE:
        if (!this.isCurrentUserPresenter()) {
          store.dispatch(setWhiteboardCurrentPage(Number(payload.message)));
        }
        break;
      case DataMsgBodyType.FILE_CHANGE:
        if (!this.isCurrentUserPresenter()) {
          store.dispatch(updateCurrentWhiteboardOfficeFileId(payload.message));
        }
        break;
      case DataMsgBodyType.UPDATE_CURRENT_OFFICE_FILE_PAGES:
        if (!this.isCurrentUserPresenter()) {
          store.dispatch(updateCurrentOfficeFilePages(payload.message));
        }
        break;
      case DataMsgBodyType.WHITEBOARD_APP_STATE_CHANGE:
        if (!this.isCurrentUserPresenter()) {
          store.dispatch(
            updateMouseAppStateChanges(JSON.parse(payload.message)),
          );
        }
        break;
    }
  };

  private isCurrentUserPresenter() {
    return store.getState().session.currentUser?.metadata?.isPresenter;
  }
}
