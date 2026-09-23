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
      // Non-presenters usually don't have the office file in their local list,
      // so `updateCurrentWhiteboardOfficeFileId` can't set `totalPages` for them.
      // The presenter's page list is authoritative: derive the count from it so
      // a later presenter take-over doesn't inherit a stale value.
      if (action.payload !== '') {
        try {
          const pages = JSON.parse(action.payload);
          if (pages && isArray(pages) && pages.length > 0) {
            state.totalPages = pages.length;
          }
        } catch {
          // keep the previous totalPages on a malformed payload
        }
      }
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
      // If this file is already the active one (registered late, e.g. right
      // after a presenter take-over), refresh the active view from the
      // server-provided metadata. Keep an existing page list: it carries the
      // element ids the previous presenter already placed on the canvas.
      if (state.currentWhiteboardOfficeFileId === action.payload.fileId) {
        state.totalPages = action.payload.totalPages;
        if (state.currentOfficeFilePages === '') {
          state.currentOfficeFilePages = action.payload.pageFiles;
        }
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
