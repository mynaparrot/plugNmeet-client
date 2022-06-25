import { WhiteboardMsg } from '../../store/slices/interfaces/dataMessages';
import { store } from '../../store';
import {
  addWhiteboardFileAsJSON,
  addWhiteboardUploadedOfficeFiles,
  setWhiteboardCurrentPage,
  updateExcalidrawElements,
  updateMousePointerLocation,
} from '../../store/slices/whiteboard';
import { IWhiteboardOfficeFile } from '../../store/slices/interfaces/whiteboard';

export const handleWhiteboardMsg = (data: WhiteboardMsg) => {
  if (data.type === 'SCENE_UPDATE') {
    store.dispatch(updateExcalidrawElements(data.msg));
  } else if (data.type === 'POINTER_UPDATE') {
    store.dispatch(updateMousePointerLocation(data.msg));
  } else if (data.type === 'ADD_WHITEBOARD_FILE') {
    store.dispatch(addWhiteboardFileAsJSON(data.msg));
  } else if (data.type === 'PAGE_CHANGE') {
    store.dispatch(setWhiteboardCurrentPage(Number(data.msg)));
  } else if (data.type === 'ADD_WHITEBOARD_OFFICE_FILE') {
    handleAddWhiteboardOfficeFile(data.msg);
  }
};

const handleAddWhiteboardOfficeFile = (msg: string) => {
  const newFile: IWhiteboardOfficeFile = JSON.parse(msg);
  store.dispatch(addWhiteboardUploadedOfficeFiles(newFile));
};
