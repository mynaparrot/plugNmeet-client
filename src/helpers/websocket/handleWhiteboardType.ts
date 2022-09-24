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

export const handleWhiteboardMsg = (body: DataMsgBody) => {
  const isPresenter =
    store.getState().session.currentUser?.metadata?.is_presenter;

  if (body.type === DataMsgBodyType.SCENE_UPDATE) {
    store.dispatch(updateExcalidrawElements(body.msg));
  } else if (body.type === DataMsgBodyType.POINTER_UPDATE) {
    store.dispatch(updateMousePointerLocation(body.msg));
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
