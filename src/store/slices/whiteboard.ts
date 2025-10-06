import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { isEmpty } from 'es-toolkit/compat';

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
      const file = state.whiteboardUploadedOfficeFiles.find(
        (f) => f.fileId === action.payload,
      );
      if (file) {
        state.totalPages = file.totalPages;
        if (!isEmpty(file.pageFiles)) {
          state.currentOfficeFilePages = file.pageFiles;
        } else {
          state.currentOfficeFilePages = '';
        }
      }
      // this is very important otherwise non-presenter won't refresh whiteboard
      state.currentWhiteboardOfficeFileId = action.payload;
      state.currentPage = 1;
    },
    updateCurrentOfficeFilePages: (state, action: PayloadAction<string>) => {
      state.currentOfficeFilePages = action.payload;
    },
    addWhiteboardUploadedOfficeFile: (
      state,
      action: PayloadAction<IWhiteboardOfficeFile>,
    ) => {
      const exists = state.whiteboardUploadedOfficeFiles.some(
        (f) => f.fileId === action.payload.fileId,
      );
      if (!exists) {
        // Redux Toolkit with Immer allows us to "mutate" the state directly.
        state.whiteboardUploadedOfficeFiles.push(action.payload);
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
  updateCurrentOfficeFilePages,
  addWhiteboardUploadedOfficeFile,
  doRefreshWhiteboard,
  addAllExcalidrawElements,
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;
