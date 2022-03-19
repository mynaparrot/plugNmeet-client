export interface IWhiteboardSlice {
  excalidrawElements: string;
  mousePointerLocation: string;
  whiteboardFiles: string;
  lastExcalidrawElements: string;
}

export interface IWhiteboardFile {
  filePath: string;
  fileName: string;
}
