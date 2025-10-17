import { DataChannelMessage, DataMsgBodyType } from 'plugnmeet-protocol-js';

import { store } from '../../store';
import {
  setWhiteboardCurrentPage,
  triggerWhiteboardReset,
  updateCurrentOfficeFilePages,
  updateCurrentWhiteboardOfficeFileId,
  updateExcalidrawElements,
  updateMouseAppStateChanges,
  updateMousePointerLocation,
} from '../../store/slices/whiteboard';

export default class HandleWhiteboard {
  public handleWhiteboardMsg = async (payload: DataChannelMessage) => {
    switch (payload.type) {
      case DataMsgBodyType.SCENE_UPDATE:
        store.dispatch(updateExcalidrawElements(payload.message));
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
      case DataMsgBodyType.WHITEBOARD_RESET:
        if (!this.isCurrentUserPresenter()) {
          store.dispatch(triggerWhiteboardReset());
        }
        break;
    }
  };

  private isCurrentUserPresenter() {
    return store.getState().session.currentUser?.metadata?.isPresenter;
  }
}
