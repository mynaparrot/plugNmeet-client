import { WhiteboardMsg } from '../../store/slices/interfaces/dataMessages';
import { store } from '../../store';
import {
  addWhiteboardFileAsJSON,
  setWhiteboardCurrentPage,
  updateExcalidrawElements,
  updateMousePointerLocation,
} from '../../store/slices/whiteboard';

export const handleWhiteboardMsg = (data: WhiteboardMsg) => {
  if (data.type === 'SCENE_UPDATE') {
    store.dispatch(updateExcalidrawElements(data.msg));
  } else if (data.type === 'POINTER_UPDATE') {
    store.dispatch(updateMousePointerLocation(data.msg));
  } else if (data.type === 'ADD_WHITEBOARD_FILE') {
    store.dispatch(addWhiteboardFileAsJSON(data.msg));
  } else if (data.type === 'PAGE_CHANGE') {
    store.dispatch(setWhiteboardCurrentPage(Number(data.msg)));
  }
};
