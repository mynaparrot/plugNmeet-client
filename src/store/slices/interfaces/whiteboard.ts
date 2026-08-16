import type { NormalizedZoomValue } from '@excalidraw/excalidraw/types';

export interface IWhiteboardSlice {
  totalPages: number;
  currentPage: number;
  mousePointerLocation: string;
  whiteboardAppState: IWhiteboardAppState | null;
  currentWhiteboardOfficeFileId: string;
  currentOfficeFilePages: string;
  whiteboardUploadedOfficeFiles: Array<IWhiteboardOfficeFile>;
  refreshWhiteboardSignal: number;
  refreshWhiteboardFilesListSignal: number;
}

export type WhiteboardPageOrientation = 'portrait' | 'landscape';

export interface IWhiteboardFile {
  id: string;
  currentPage: number;
  filePath: string;
  fileName: string;
  uploaderWhiteboardHeight: number;
  uploaderWhiteboardWidth: number;
  isOfficeFile: boolean;
  /** Server-side sidecar: page_N_meta.json (same dir as page_N.png). Always present for office pages. */
  metaFilePath: string;
}

/** Shape of page_N_meta.json written during whiteboard conversion. */
export interface WhiteboardOfficePageMeta {
  page: number;
  orientation: WhiteboardPageOrientation;
  width: number;
  height: number;
}

export interface IWhiteboardOfficeFile {
  fileId: string;
  fileName: string;
  filePath: string;
  totalPages: number;
  currentPage?: number;
  pageFiles: string;
}

export interface IWhiteboardAppState {
  height: number;
  width: number;
  scrollX: number;
  scrollY: number;
  zoomValue: NormalizedZoomValue;
  theme: string;
  viewBackgroundColor: string;
  zenModeEnabled: boolean;
  gridSize: number | null;
}

export interface WhiteboardFileConversionReq {
  roomId: string;
  roomSid: string;
  userId: string;
  filePath: string;
}

export interface WhiteboardFileConversionRes {
  status: boolean;
  msg: string;
  fileName: string;
  fileId: string;
  filePath: string;
  totalPages: number;
}
