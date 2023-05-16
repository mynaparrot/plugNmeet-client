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
    addText: speechServicesAdapter.upsertOne,
    removeOne: speechServicesAdapter.removeOne,
    removeAll: speechServicesAdapter.removeAll,
  },
});

export const { addText, removeOne, removeAll } = SpeechServicesSlice.actions;
export default SpeechServicesSlice.reducer;
