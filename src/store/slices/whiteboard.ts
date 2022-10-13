import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  IRequestWhiteboardData,
  IWhiteboardAppState,
  IWhiteboardFile,
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
  whiteboardOfficeFilePagesAndOtherImages: '',
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
    addWhiteboardOtherImageFile: (
      state,
      action: PayloadAction<IWhiteboardFile>,
    ) => {
      let files: Array<IWhiteboardFile> = [];
      if (state.whiteboardOfficeFilePagesAndOtherImages) {
        files = JSON.parse(state.whiteboardOfficeFilePagesAndOtherImages);
      }
      files.push(action.payload);
      state.whiteboardOfficeFilePagesAndOtherImages = JSON.stringify(files);
    },
    addWhiteboardFileAsJSON: (state, action: PayloadAction<string>) => {
      state.whiteboardOfficeFilePagesAndOtherImages = action.payload;
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
      const file = state.whiteboardUploadedOfficeFiles.filter(
        (f) => f.fileId === action.payload,
      );
      if (file.length) {
        state.currentPage = 1;
        state.totalPages = file[0].totalPages;
        state.whiteboardOfficeFilePagesAndOtherImages = file[0].pageFiles;
        state.currentWhiteboardOfficeFileId = file[0].fileId;
      }
    },
    addWhiteboardUploadedOfficeFiles: (
      state,
      action: PayloadAction<IWhiteboardOfficeFile>,
    ) => {
      const exist = state.whiteboardUploadedOfficeFiles.filter(
        (f) => f.fileId === action.payload.fileId,
      );
      if (!exist.length) {
        const tmp = [...state.whiteboardUploadedOfficeFiles];
        tmp.push(action.payload);
        state.whiteboardUploadedOfficeFiles = tmp;
      }

      // set new file as current selected
      state.currentWhiteboardOfficeFileId = action.payload.fileId;
      // update current file pages
      state.whiteboardOfficeFilePagesAndOtherImages = action.payload.pageFiles;

      // update current page
      if (action.payload.currentPage) {
        state.currentPage = action.payload.currentPage;
      } else {
        state.currentPage = 1;
      }
      // update total page
      state.totalPages = action.payload.totalPages;
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
  addWhiteboardOtherImageFile,
  updateRequestedWhiteboardData,
  setWhiteboardCurrentPage,
  addWhiteboardFileAsJSON,
  updateCurrentWhiteboardOfficeFileId,
  addWhiteboardUploadedOfficeFiles,
  doRefreshWhiteboard,
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;
