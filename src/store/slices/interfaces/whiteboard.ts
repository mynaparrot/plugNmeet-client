export interface IWhiteboardSlice {
  excalidrawElements: string;
  mousePointerLocation: string;
  whiteboardFiles: string;
  lastExcalidrawElements: string;
}

export interface IWhiteboardFile {
  id: string;
  filePath: string;
  fileName: string;
}
