import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';

import {
  ISpeechServices,
  ISpeechSubtitleText,
} from './interfaces/speechServices';

const initialState: ISpeechServices = {
  selectedSubtitleLang: '',
  interimText: undefined,
  finalText: '',
  lastFinalTexts: [],
};

const speechServicesSlice = createSlice({
  name: 'speech-services',
  initialState,
  reducers: {
    updateSelectedSubtitleLang: (state, action: PayloadAction<string>) => {
      state.selectedSubtitleLang = action.payload;
      state.interimText = undefined;
      state.finalText = '';
    },
    addSpeechSubtitleText: (
      state,
      action: PayloadAction<ISpeechSubtitleText>,
    ) => {
      if (action.payload.type === 'interim') {
        state.interimText = action.payload.result;
      } else {
        state.interimText = undefined;
        state.finalText = action.payload.result.text;
        if (!isEmpty(action.payload.result.text)) {
          state.lastFinalTexts.push(action.payload.result);
        }
      }
    },
  },
});

export const { updateSelectedSubtitleLang, addSpeechSubtitleText } =
  speechServicesSlice.actions;
export default speechServicesSlice.reducer;
