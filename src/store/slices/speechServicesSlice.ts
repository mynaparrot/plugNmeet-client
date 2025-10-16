import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
  ISpeechServices,
  ISpeechSubtitleText,
  SELECTED_SUBTITLE_LANG_KEY,
  TextWithInfo,
} from './interfaces/speechServices';
import {
  DB_STORE_SPEECH_TO_TEXT_FINAL_TEXTS,
  DB_STORE_USER_SETTINGS,
  idbStore,
} from '../../helpers/libs/idb';

const initialState: ISpeechServices = {
  selectedSubtitleLang: '',
  subtitleFontSize: 14,
  interimText: undefined,
  finalText: undefined,
  lastFinalTexts: [],
};

const speechServicesSlice = createSlice({
  name: 'speech-services',
  initialState,
  reducers: {
    updateSelectedSubtitleLang: (state, action: PayloadAction<string>) => {
      state.selectedSubtitleLang = action.payload;
      state.interimText = undefined;
      state.finalText = undefined;
      idbStore(
        DB_STORE_USER_SETTINGS,
        SELECTED_SUBTITLE_LANG_KEY,
        state.selectedSubtitleLang,
      ).then();
    },
    updateSubtitleFontSize: (state, action: PayloadAction<number>) => {
      state.subtitleFontSize = action.payload;
    },
    addSpeechSubtitleText: (
      state,
      action: PayloadAction<ISpeechSubtitleText>,
    ) => {
      if (action.payload.type === 'interim') {
        state.interimText = action.payload.result;
      } else {
        state.interimText = undefined;
        state.finalText = action.payload.result;
        if (action.payload.result.text !== '') {
          state.lastFinalTexts.push(action.payload.result);
          // only store the valid final data
          idbStore(
            DB_STORE_SPEECH_TO_TEXT_FINAL_TEXTS,
            action.payload.result.id,
            action.payload.result,
          ).then();
        }
      }
    },
    setSpeechToTextLastFinalTexts: (
      state,
      action: PayloadAction<{
        selectedSubtitleLang: string;
        lastFinalTexts: TextWithInfo[];
      }>,
    ) => {
      state.selectedSubtitleLang = action.payload.selectedSubtitleLang;
      state.lastFinalTexts = action.payload.lastFinalTexts;
    },
  },
});

export const {
  updateSelectedSubtitleLang,
  updateSubtitleFontSize,
  addSpeechSubtitleText,
  setSpeechToTextLastFinalTexts,
} = speechServicesSlice.actions;
export default speechServicesSlice.reducer;
