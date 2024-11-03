import { toast } from 'react-toastify';
import { DataChannelMessage, DataMsgBodyType } from 'plugnmeet-protocol-js';

import { store } from '../../store';
import {
  addWhiteboardFileAsJSON,
  addWhiteboardUploadedOfficeFiles,
  setWhiteboardCurrentPage,
  updateExcalidrawElements,
  updateMouseAppStateChanges,
  updateMousePointerLocation,
} from '../../store/slices/whiteboard';
import { IWhiteboardOfficeFile } from '../../store/slices/interfaces/whiteboard';
import { decryptMessage } from '../cryptoMessages';

export default class HandleWhiteboard {
  private _isEnabledE2EE: boolean | undefined = undefined;

  constructor() {}

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
      case DataMsgBodyType.ADD_WHITEBOARD_FILE:
        store.dispatch(addWhiteboardFileAsJSON(payload.message));
        break;
      case DataMsgBodyType.PAGE_CHANGE:
        if (!this.isCurrentUserPresenter()) {
          store.dispatch(setWhiteboardCurrentPage(Number(payload.message)));
        }
        break;
      case DataMsgBodyType.ADD_WHITEBOARD_OFFICE_FILE:
        this.handleAddWhiteboardOfficeFile(payload.message);
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

  private handleAddWhiteboardOfficeFile(msg: string) {
    const newFile: IWhiteboardOfficeFile = JSON.parse(msg);
    store.dispatch(addWhiteboardUploadedOfficeFiles(newFile));
  }

  private async handleDecryption(msg: string) {
    if (typeof this._isEnabledE2EE === 'undefined') {
      const e2ee =
        store.getState().session.currentRoom.metadata?.roomFeatures
          ?.endToEndEncryptionFeatures;
      this._isEnabledE2EE = !!(
        e2ee &&
        e2ee.isEnabled &&
        e2ee.includedWhiteboard &&
        e2ee.encryptionKey
      );
    }
    if (this._isEnabledE2EE) {
      try {
        return await decryptMessage(msg);
      } catch (e: any) {
        toast('Decryption error: ' + e.message, {
          type: 'error',
        });
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
