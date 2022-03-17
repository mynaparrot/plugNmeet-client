import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IWhiteboardSlice } from './interfaces/whiteboard';

const initialState: IWhiteboardSlice = {
  excalidrawElements: '',
  mousePointerLocation: '',
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
  },
});

export const { updateExcalidrawElements, updateMousePointerLocation } =
  whiteboardSlice.actions;

export default whiteboardSlice.reducer;
