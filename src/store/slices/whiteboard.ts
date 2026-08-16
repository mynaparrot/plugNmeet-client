import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
  IWhiteboardAppState,
  IWhiteboardOfficeFile,
  IWhiteboardSlice,
  WhiteboardDataAsDonorData,
} from './interfaces/whiteboard';
import { isArray } from 'es-toolkit/compat';

const initialState: IWhiteboardSlice = {
  totalPages: 10,
  currentPage: 1,
  mousePointerLocation: '',
  whiteboardAppState: null,
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
  refreshWhiteboardSignal: 0,
  refreshWhiteboardFilesListSignal: 0,
};

const whiteboardSlice = createSlice({
  name: 'whiteboard',
  initialState,
  reducers: {
    updateMousePointerLocation: (state, action: PayloadAction<string>) => {
      state.mousePointerLocation = action.payload;
    },
    updateMouseAppStateChanges: (
      state,
      action: PayloadAction<IWhiteboardAppState>,
    ) => {
      state.whiteboardAppState = action.payload;
    },
    setWhiteboardCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    updateCurrentWhiteboardOfficeFileId: (
      state,
      action: PayloadAction<{ fileId: string; page: number }>,
    ) => {
      const { fileId, page } = action.payload;

      const file = state.whiteboardUploadedOfficeFiles.find(
        (f) => f.fileId === fileId,
      );
      if (file) {
        state.totalPages = file.totalPages;
        state.currentOfficeFilePages = file.pageFiles;
      } else {
        // This typically occurs for non-presenters who don't have the file in their local list.
        // The page data will be synced from the presenter.
        state.currentOfficeFilePages = '';
      }

      state.currentWhiteboardOfficeFileId = fileId;
      state.currentPage = page;
    },
    updateCurrentOfficeFilePages: (state, action: PayloadAction<string>) => {
      state.currentOfficeFilePages = action.payload;
    },
    addWhiteboardUploadedOfficeFile: (
      state,
      action: PayloadAction<IWhiteboardOfficeFile>,
    ) => {
      if (action.payload.fileId === '' || action.payload.totalPages == 0) {
        return;
      }
      const exists = state.whiteboardUploadedOfficeFiles.some(
        (f) => f.fileId === action.payload.fileId,
      );
      if (!exists) {
        state.whiteboardUploadedOfficeFiles.push(action.payload);
      }
    },
    triggerRefreshWhiteboard: (state) => {
      state.refreshWhiteboardSignal = Date.now();
    },
    triggerRefreshWhiteboardFilesListSignal: (state) => {
      state.refreshWhiteboardFilesListSignal = Date.now();
    },
    addWhiteboardDataSentFromDonor: (
      state,
      action: PayloadAction<WhiteboardDataAsDonorData>,
    ) => {
      state.currentWhiteboardOfficeFileId =
        action.payload.currentWhiteboardOfficeFileId;
      state.currentPage = action.payload.currentPageNumber;
      state.currentOfficeFilePages = action.payload.currentOfficeFilePages;

      if (action.payload.currentOfficeFilePages !== '') {
        const pages = JSON.parse(action.payload.currentOfficeFilePages);
        if (pages && isArray(pages) && pages.length > 0) {
          state.totalPages = pages.length;
        }
      }
      state.whiteboardAppState = action.payload.appState;
    },
  },
});

export const {
  updateMousePointerLocation,
  updateMouseAppStateChanges,
  setWhiteboardCurrentPage,
  updateCurrentWhiteboardOfficeFileId,
  updateCurrentOfficeFilePages,
  addWhiteboardUploadedOfficeFile,
  triggerRefreshWhiteboard,
  triggerRefreshWhiteboardFilesListSignal,
  addWhiteboardDataSentFromDonor,
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;
