import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { RootState } from '..';
import { IActiveSpeaker } from './interfaces/activeSpeakers';

const activeSpeakerAdapter = createEntityAdapter({
  selectId: (speaker: IActiveSpeaker) => speaker.userId,
  sortComparer: (a: IActiveSpeaker, b: IActiveSpeaker) => {
    if (a.isSpeaking && b.isSpeaking) {
      return a.audioLevel - b.audioLevel;
    }
    if (a.isSpeaking !== b.isSpeaking) {
      if (a.isSpeaking) {
        return -1;
      } else {
        return 1;
      }
    }
    // last active speaker first
    if (a.lastSpokeAt !== b.lastSpokeAt) {
      return b.lastSpokeAt - a.lastSpokeAt;
    }
    return 0;
  },
});
export const activeSpeakersSelector = activeSpeakerAdapter.getSelectors(
  (state: RootState) => state.activeSpeakers,
);

const activeSpeakersSlice = createSlice({
  name: 'activeSpeakers',
  initialState: activeSpeakerAdapter.getInitialState(),
  reducers: {
    addSpeaker: activeSpeakerAdapter.addOne,
    addManySpeakers: activeSpeakerAdapter.addMany,
    setAllSpeakers: activeSpeakerAdapter.setAll,
    removeSpeakers: activeSpeakerAdapter.removeAll,
    removeOneSpeaker: activeSpeakerAdapter.removeOne,
  },
});

export const {
  addSpeaker,
  addManySpeakers,
  removeSpeakers,
  removeOneSpeaker,
  setAllSpeakers,
} = activeSpeakersSlice.actions;
export default activeSpeakersSlice.reducer;
