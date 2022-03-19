import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IWhiteboardFile, IWhiteboardSlice } from './interfaces/whiteboard';

const initialState: IWhiteboardSlice = {
  excalidrawElements: '',
  mousePointerLocation: '',
  whiteboardFiles: '',
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
  },
});

export const {
  updateExcalidrawElements,
  updateMousePointerLocation,
  addWhiteboardFile,
  addWhiteboardFileAsJSON,
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;
