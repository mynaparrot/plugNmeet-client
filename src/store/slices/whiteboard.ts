import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  IRequestWhiteboardData,
  IWhiteboardFile,
  IWhiteboardSlice,
} from './interfaces/whiteboard';

const initialState: IWhiteboardSlice = {
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
  },
});

export const {
  updateExcalidrawElements,
  updateMousePointerLocation,
  addWhiteboardFile,
  addWhiteboardFileAsJSON,
  updateRequestedWhiteboardData,
  setWhiteboardCurrentPage,
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;
