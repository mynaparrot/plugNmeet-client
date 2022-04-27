import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IExternalMediaPlayerSlice {
  action: string;
  seekTo: number;
}

const initialState: IExternalMediaPlayerSlice = {
  action: '',
  seekTo: -1,
};

const externalMediaPlayerSlice = createSlice({
  name: 'externalMediaPlayer',
  initialState,
  reducers: {
    addExternalMediaPlayerAction: (state, action: PayloadAction<string>) => {
      state.action = action.payload;
    },
    externalMediaPlayerSeekTo: (state, action: PayloadAction<number>) => {
      state.seekTo = action.payload;
    },
    resetExternalMediaPlayer: (state) => {
      state.action = '';
      state.seekTo = -1;
    },
  },
});

export const {
  addExternalMediaPlayerAction,
  externalMediaPlayerSeekTo,
  resetExternalMediaPlayer,
} = externalMediaPlayerSlice.actions;

export default externalMediaPlayerSlice.reducer;
