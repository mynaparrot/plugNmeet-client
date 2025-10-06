import { DataChannelMessage, DataMsgBodyType } from 'plugnmeet-protocol-js';

import { store } from '../../store';
import {
  setWhiteboardCurrentPage,
  updateCurrentOfficeFilePages,
  updateCurrentWhiteboardOfficeFileId,
  updateExcalidrawElements,
  updateMouseAppStateChanges,
  updateMousePointerLocation,
} from '../../store/slices/whiteboard';
import { decryptMessage } from '../libs/cryptoMessages';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';

export default class HandleWhiteboard {
  private _isEnabledE2EE: boolean | undefined = undefined;

  public handleWhiteboardMsg = async (payload: DataChannelMessage) => {
    let finalMsg: string | undefined;

    switch (payload.type) {
      case DataMsgBodyType.SCENE_UPDATE:
        finalMsg = await this.handleDecryption(payload.message);
        if (typeof finalMsg !== 'undefined') {
          store.dispatch(updateExcalidrawElements(finalMsg));
        }
        break;
      case DataMsgBodyType.POINTER_UPDATE:
        finalMsg = await this.handleDecryption(payload.message);
        if (typeof finalMsg !== 'undefined') {
          store.dispatch(updateMousePointerLocation(finalMsg));
        }
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

  private async handleDecryption(msg: string) {
    if (typeof this._isEnabledE2EE === 'undefined') {
      const e2ee =
        store.getState().session.currentRoom.metadata?.roomFeatures
          ?.endToEndEncryptionFeatures;
      this._isEnabledE2EE = !!(
        e2ee &&
        e2ee.isEnabled &&
        e2ee.includedWhiteboard
      );
    }
    if (this._isEnabledE2EE) {
      try {
        return await decryptMessage(msg);
      } catch (e: any) {
        store.dispatch(
          addUserNotification({
            message: 'Decryption error: ' + e.message,
            typeOption: 'error',
          }),
        );
        console.error('Decryption error:' + e.message);
        return undefined;
      }
    }
    return msg;
  }

  private isCurrentUserPresenter() {
    return store.getState().session.currentUser?.metadata?.isPresenter;
  }
}
