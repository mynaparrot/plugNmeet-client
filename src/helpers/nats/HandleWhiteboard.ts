import { toast } from 'react-toastify';

import ConnectNats from './ConnectNats';
import { EndToEndEncryptionFeatures } from '../../store/slices/interfaces/session';
import { DataMsgBodyType } from '../proto/plugnmeet_datamessage_pb';
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
import { DataChannelMessage } from '../proto/plugnmeet_nats_msg_pb';

export default class HandleWhiteboard {
  private _that: ConnectNats;
  private checkedE2EE = false;
  private _e2eeFeatures: EndToEndEncryptionFeatures | undefined = undefined;

  constructor(that: ConnectNats) {
    this._that = that;
  }

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
    if (!this._e2eeFeatures && !this.checkedE2EE) {
      this.checkedE2EE = true;

      this._e2eeFeatures =
        store.getState().session.currentRoom.metadata?.room_features.end_to_end_encryption_features;
    }

    if (
      typeof this._e2eeFeatures !== 'undefined' &&
      this._e2eeFeatures.is_enabled &&
      this._e2eeFeatures.included_whiteboard &&
      this._e2eeFeatures.encryption_key
    ) {
      try {
        return await decryptMessage(this._e2eeFeatures.encryption_key, msg);
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
    return session.currentUser?.metadata?.is_presenter;
  }
}