import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  IRequestWhiteboardData,
  IWhiteboardAppState,
  IWhiteboardOfficeFile,
  IWhiteboardSlice,
} from './interfaces/whiteboard';

const initialState: IWhiteboardSlice = {
  totalPages: 10,
  currentPage: 1,
  excalidrawElements: '',
  mousePointerLocation: '',
  whiteboardAppState: null,
  requestedWhiteboardData: {
    requested: false,
    sendTo: '',
  },
  currentWhiteboardOfficeFileId: 'default',
  currentOfficeFilePages: '',
  whiteboardUploadedOfficeFiles: [
    {
      fileId: 'default',
      fileName: 'default',
      filePath: 'default',
      totalPages: 10,
      currentPage: 1,
      pageFiles: '',
    },
  ],
  refreshWhiteboard: 0,
  allExcalidrawElements: '',
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
    updateMouseAppStateChanges: (
      state,
      action: PayloadAction<IWhiteboardAppState>,
    ) => {
      state.whiteboardAppState = action.payload;
    },
    addAllExcalidrawElements: (state, action: PayloadAction<string>) => {
      state.allExcalidrawElements = action.payload;
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
    updateCurrentWhiteboardOfficeFileId: (
      state,
      action: PayloadAction<string>,
    ) => {
      // this is very important otherwise non-presenter won't refresh whiteboard
      state.currentWhiteboardOfficeFileId = action.payload;
      state.currentPage = 1;

      const file = state.whiteboardUploadedOfficeFiles.filter(
        (f) => f.fileId === action.payload,
      );
      if (file.length) {
        state.totalPages = file[0].totalPages;
        state.currentOfficeFilePages = file[0].pageFiles;
      }
    },
    addWhiteboardUploadedOfficeFile: (
      state,
      action: PayloadAction<IWhiteboardOfficeFile>,
    ) => {
      const exist = state.whiteboardUploadedOfficeFiles.filter(
        (f) => f.fileId === action.payload.fileId,
      );
      if (!exist.length) {
        state.whiteboardUploadedOfficeFiles = [
          ...state.whiteboardUploadedOfficeFiles,
          action.payload,
        ];
      }
    },
    doRefreshWhiteboard: (state) => {
      state.refreshWhiteboard = Date.now();
    },
  },
});

export const {
  updateExcalidrawElements,
  updateMousePointerLocation,
  updateMouseAppStateChanges,
  updateRequestedWhiteboardData,
  setWhiteboardCurrentPage,
  updateCurrentWhiteboardOfficeFileId,
  addWhiteboardUploadedOfficeFile,
  doRefreshWhiteboard,
  addAllExcalidrawElements,
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;
