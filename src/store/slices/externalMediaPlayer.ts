import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type playerActionEvent = 'play' | 'pause' | 'seeked' | 'sync' | '';

export interface IExternalMediaPlayerEvent {
  action: playerActionEvent;
  isPlaying?: boolean;
  seekTo?: number;
  playbackRate?: number;
  updatedAt?: number;
}

const initialState: IExternalMediaPlayerEvent = {
  action: '',
  seekTo: -1,
  playbackRate: 1,
};

const isValidSeek = (value?: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isValidRate = (value?: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const externalMediaPlayerSlice = createSlice({
  name: 'externalMediaPlayer',
  initialState,
  reducers: {
    addExternalMediaPlayerEvent: (state, action: PayloadAction<IExternalMediaPlayerEvent>) => {
      const payload = action.payload;

      state.action = payload.action;

      if (typeof payload.isPlaying === 'boolean') {
        state.isPlaying = payload.isPlaying;
      } else {
        // Older senders only include action; 'seeked'/'sync' must not change play state.
        state.isPlaying =
          payload.action === 'play' ? true : payload.action === 'pause' ? false : undefined;
      }

      state.seekTo = isValidSeek(payload.seekTo) ? payload.seekTo : -1;

      if (isValidRate(payload.playbackRate)) {
        state.playbackRate = payload.playbackRate;
      }

      state.updatedAt = payload.updatedAt ?? Date.now();
    },
    resetExternalMediaPlayer: (state) => {
      state.action = '';
      state.isPlaying = undefined;
      state.seekTo = -1;
      state.playbackRate = 1;
      state.updatedAt = 0;
    },
  },
});

export const { addExternalMediaPlayerEvent, resetExternalMediaPlayer } =
  externalMediaPlayerSlice.actions;

export default externalMediaPlayerSlice.reducer;
