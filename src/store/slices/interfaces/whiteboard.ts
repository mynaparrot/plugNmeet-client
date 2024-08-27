import type { NormalizedZoomValue } from '@excalidraw/excalidraw/types/types';

export interface IWhiteboardSlice {
  totalPages: number;
  currentPage: number;
  excalidrawElements: string;
  mousePointerLocation: string;
  whiteboardAppState: IWhiteboardAppState | null;
  requestedWhiteboardData: IRequestWhiteboardData;
  currentWhiteboardOfficeFileId: string;
  whiteboardOfficeFilePagesAndOtherImages: string;
  whiteboardUploadedOfficeFiles: Array<IWhiteboardOfficeFile>;
  refreshWhiteboard: number;
}

export interface IWhiteboardFile {
  id: string;
  currentPage: number;
  filePath: string;
  fileName: string;
  uploaderWhiteboardHeight: number;
  uploaderWhiteboardWidth: number;
  isOfficeFile: boolean;
}

// TODO: change IWhiteboardFeatures type correctly
// ref: src/components/whiteboard/helpers/utils.ts
// handleToAddWhiteboardUploadedOfficeNewFile
export interface IWhiteboardFeatures {
  preload_file?: string;
  whiteboard_file_id: string;
  file_name: string;
  file_path: string;
  total_pages: number;
}

export interface IRequestWhiteboardData {
  requested: boolean;
  sendTo: string;
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
