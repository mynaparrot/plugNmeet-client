import { toast } from 'react-toastify';
import {
  DataChannelMessage,
  DataMsgBodyType,
  EndToEndEncryptionFeatures,
} from 'plugnmeet-protocol-js';

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
  private checkedE2EE = false;
  private _e2eeFeatures: EndToEndEncryptionFeatures | undefined = undefined;

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
    if (!this.checkedE2EE) {
      this.checkedE2EE = true;
      this._e2eeFeatures =
        store.getState().session.currentRoom.metadata?.roomFeatures?.endToEndEncryptionFeatures;
    }

    if (
      typeof this._e2eeFeatures !== 'undefined' &&
      this._e2eeFeatures.isEnabled &&
      this._e2eeFeatures.includedWhiteboard &&
      this._e2eeFeatures.encryptionKey
    ) {
      try {
        return await decryptMessage(this._e2eeFeatures.encryptionKey, msg);
      } catch (e: any) {
        toast('Decryption error: ' + e.message, {
          type: 'error',
        });
        console.error('Decryption error:' + e.message);
        return undefined;
      }
    } else {
      return msg;
    }
  }

  private isCurrentUserPresenter() {
    const session = store.getState().session;
    return session.currentUser?.metadata?.isPresenter;
  }
}
