import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { SpeechServiceData } from './interfaces/SpeechServices';

const speechServicesAdapter = createEntityAdapter<SpeechServiceData>({
  selectId: (data) => data.lang + '_' + data.type,
});

export const speechServicesSelector = speechServicesAdapter.getSelectors(
  (state: RootState) => state.speechServiceData,
);

const SpeechServicesSlice = createSlice({
  name: 'speech-services',
  initialState: speechServicesAdapter.getInitialState(),
  reducers: {
    addSpeechSubtitleText: speechServicesAdapter.upsertOne,
    removeSpeechSubtitleText: speechServicesAdapter.removeOne,
    removeAllSpeechSubtitleText: speechServicesAdapter.removeAll,
  },
});

export const {
  addSpeechSubtitleText,
  removeSpeechSubtitleText,
  removeAllSpeechSubtitleText,
} = SpeechServicesSlice.actions;
export default SpeechServicesSlice.reducer;
