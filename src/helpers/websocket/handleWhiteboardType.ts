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
import {
  DataMsgBody,
  DataMsgBodyType,
} from '../proto/plugnmeet_datamessage_pb';
import { decryptMessage } from '../cryptoMessages';
import { toast } from 'react-toastify';
import { EndToEndEncryptionFeatures } from '../../store/slices/interfaces/session';

export const handleWhiteboardMsg = async (body: DataMsgBody) => {
  const session = store.getState().session;
  const isPresenter = session.currentUser?.metadata?.is_presenter;

  if (body.type === DataMsgBodyType.SCENE_UPDATE) {
    const finalMsg = await handleDecryption(body.msg);
    if (typeof finalMsg !== 'undefined') {
      store.dispatch(updateExcalidrawElements(finalMsg));
    }
  } else if (body.type === DataMsgBodyType.POINTER_UPDATE) {
    const finalMsg = await handleDecryption(body.msg);
    if (typeof finalMsg !== 'undefined') {
      store.dispatch(updateMousePointerLocation(finalMsg));
    }
  } else if (body.type === DataMsgBodyType.ADD_WHITEBOARD_FILE) {
    store.dispatch(addWhiteboardFileAsJSON(body.msg));
  } else if (body.type === DataMsgBodyType.PAGE_CHANGE) {
    if (!isPresenter) {
      store.dispatch(setWhiteboardCurrentPage(Number(body.msg)));
    }
  } else if (body.type === DataMsgBodyType.ADD_WHITEBOARD_OFFICE_FILE) {
    handleAddWhiteboardOfficeFile(body.msg);
  } else if (body.type === DataMsgBodyType.WHITEBOARD_APP_STATE_CHANGE) {
    if (!isPresenter) {
      store.dispatch(updateMouseAppStateChanges(JSON.parse(body.msg)));
    }
  }
};

const handleAddWhiteboardOfficeFile = (msg: string) => {
  const newFile: IWhiteboardOfficeFile = JSON.parse(msg);
  store.dispatch(addWhiteboardUploadedOfficeFiles(newFile));
};

let e2ee: EndToEndEncryptionFeatures | undefined = undefined;
const handleDecryption = async (msg: string) => {
  if (!e2ee) {
    e2ee =
      store.getState().session.currentRoom.metadata?.room_features
        .end_to_end_encryption_features;
  }
  if (
    typeof e2ee !== 'undefined' &&
    e2ee.is_enabled &&
    e2ee.included_whiteboard &&
    e2ee.encryption_key
  ) {
    try {
      return await decryptMessage(e2ee.encryption_key, msg);
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
};
