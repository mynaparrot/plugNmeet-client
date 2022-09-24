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
  scrollX: number;
  scrollY: number;
  theme: string;
  viewBackgroundColor: string;
  zenModeEnabled: boolean;
  gridSize: number | null;
}
