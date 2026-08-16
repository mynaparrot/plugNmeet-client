export {
  WhiteboardController,
  getWhiteboardController,
  WHITEBOARD_REMOTE_ORIGIN,
} from './WhiteboardController';
export { decodeWhiteboardPageSnapshot, WHITEBOARD_ELEMENTS_MAP } from './utils';
export type {
  WhiteboardControllerConfig,
  WhiteboardYjsSnapshot,
} from './types';
export {
  listWhiteboardPages,
  loadWhiteboardPageSnapshot,
  saveWhiteboardPageSnapshot,
} from './whiteboardPersistence';
