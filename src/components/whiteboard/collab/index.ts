export {
  WhiteboardController,
  decodeWhiteboardPageSnapshot,
  getWhiteboardController,
  WHITEBOARD_ELEMENTS_MAP,
  WHITEBOARD_REMOTE_ORIGIN,
} from './WhiteboardController';
export type {
  WhiteboardControllerConfig,
  WhiteboardPageKey,
  WhiteboardTransport,
  WhiteboardYjsSnapshot,
} from './types';
export {
  listWhiteboardPages,
  loadWhiteboardPageSnapshot,
  saveWhiteboardPageSnapshot,
} from './whiteboardPersistence';
