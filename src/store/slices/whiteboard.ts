import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  IRequestWhiteboardData,
  IWhiteboardFile,
  IWhiteboardOfficeFile,
  IWhiteboardSlice,
} from './interfaces/whiteboard';

const initialState: IWhiteboardSlice = {
  whiteboardFileId: 'default',
  fileName: 'default',
  filePath: 'default',
  totalPages: 10,
  currentPage: 1,
  excalidrawElements: '',
  mousePointerLocation: '',
  whiteboardFiles: '',
  requestedWhiteboardData: {
    requested: false,
    sendTo: '',
  },
};

const whiteboardSlice = createSlice({
  name: 'whiteboard',
  initialState,
  reducers: {
    updateExcalidrawElements: (state, action: PayloadAction<string>) => {
      state.excalidrawElements = action.payload;
    },
    updateMousePointerLocation: (state, action: PayloadAction<string>) => {
      state.mousePointerLocation = action.payload;
    },
    addWhiteboardFile: (state, action: PayloadAction<IWhiteboardFile>) => {
      let files: Array<IWhiteboardFile> = [];
      if (state.whiteboardFiles) {
        files = JSON.parse(state.whiteboardFiles);
      }
      files.push(action.payload);
      state.whiteboardFiles = JSON.stringify(files);
    },
    addWhiteboardFileAsJSON: (state, action: PayloadAction<string>) => {
      state.whiteboardFiles = action.payload;
    },
    updateRequestedWhiteboardData: (
      state,
      action: PayloadAction<IRequestWhiteboardData>,
    ) => {
      state.requestedWhiteboardData = action.payload;
    },
    setWhiteboardCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    addWhiteboardOfficeFile: (
      state,
      action: PayloadAction<IWhiteboardOfficeFile>,
    ) => {
      state.whiteboardFileId = action.payload.fileId;
      state.fileName = action.payload.fileName;
      state.filePath = action.payload.filePath;
      state.totalPages = action.payload.totalPages;
      state.whiteboardFiles = action.payload.pageFiles;
      if (action.payload.currenPage) {
        state.currentPage = action.payload.currenPage;
      } else {
        state.currentPage = 1;
      }
    },
  },
});

export const {
  updateExcalidrawElements,
  updateMousePointerLocation,
  addWhiteboardFile,
  addWhiteboardFileAsJSON,
  updateRequestedWhiteboardData,
  setWhiteboardCurrentPage,
  addWhiteboardOfficeFile,
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;
