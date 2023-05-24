import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ISpeechServices,
  ISpeechSubtitleText,
} from './interfaces/speechServices';

const initialState: ISpeechServices = {
  selectedSubtitleLang: '',
  interimText: '',
  finalText: '',
};

const speechServicesSlice = createSlice({
  name: 'speech-services',
  initialState,
  reducers: {
    updateSelectedSubtitleLang: (state, action: PayloadAction<string>) => {
      state.selectedSubtitleLang = action.payload;
      state.interimText = '';
      state.finalText = '';
    },
    addSpeechSubtitleText: (
      state,
      action: PayloadAction<ISpeechSubtitleText>,
    ) => {
      if (action.payload.type === 'interim') {
        state.interimText = action.payload.text;
      } else {
        state.interimText = '';
        state.finalText = action.payload.text;
      }
    },
  },
});

export const { updateSelectedSubtitleLang, addSpeechSubtitleText } =
  speechServicesSlice.actions;
export default speechServicesSlice.reducer;
