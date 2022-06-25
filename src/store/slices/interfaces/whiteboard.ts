export interface IWhiteboardSlice {
  whiteboardFileId: string;
  fileName: string;
  filePath: string;
  totalPages: number;
  currentPage: number;
  excalidrawElements: string;
  mousePointerLocation: string;
  whiteboardFiles: string;
  requestedWhiteboardData: IRequestWhiteboardData;
}

export interface IWhiteboardFile {
  id: string;
  currentPage: number;
  filePath: string;
  fileName: string;
  uploaderWhiteboardHeight: number;
  uploaderWhiteboardWidth: number;
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
