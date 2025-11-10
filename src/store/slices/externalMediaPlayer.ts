import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type playerActionEvent = 'play' | 'pause' | 'seeked' | '';

export interface IExternalMediaPlayerEvent {
  action: playerActionEvent;
  seekTo?: number;
}

const initialState: IExternalMediaPlayerEvent = {
  action: '',
  seekTo: -1,
};

const externalMediaPlayerSlice = createSlice({
  name: 'externalMediaPlayer',
  initialState,
  reducers: {
    addExternalMediaPlayerEvent: (
      state,
      action: PayloadAction<IExternalMediaPlayerEvent>,
    ) => {
      state.action = action.payload.action;
      state.seekTo = action.payload.seekTo;
    },
    resetExternalMediaPlayer: (state) => {
      state.action = '';
      state.seekTo = -1;
    },
  },
});

export const { addExternalMediaPlayerEvent, resetExternalMediaPlayer } =
  externalMediaPlayerSlice.actions;

export default externalMediaPlayerSlice.reducer;
