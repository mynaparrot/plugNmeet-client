import { DataChannelMessage, DataMsgBodyType } from 'plugnmeet-protocol-js';

import { store } from '../../store';
import { getWhiteboardController } from '../../components/whiteboard/collab';
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
      case DataMsgBodyType.WHITEBOARD_SYNC_REQUEST:
      case DataMsgBodyType.WHITEBOARD_SYNC_RESPONSE:
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
          const { fileId, page } = JSON.parse(payload.message) as {
            fileId: string;
            page: number;
          };
          store.dispatch(updateCurrentWhiteboardOfficeFileId({ fileId, page }));
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
