import {
  createEntityAdapter,
  createSelector,
  createSlice,
} from '@reduxjs/toolkit';
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

export const selectAllSpeakers = activeSpeakersSelector.selectAll;

export const selectSpeakingParticipants = createSelector(
  [selectAllSpeakers], // Input selector(s)
  (speakers) => speakers.filter((speaker) => speaker.isSpeaking),
);

const activeSpeakersSlice = createSlice({
  name: 'activeSpeakers',
  initialState: activeSpeakerAdapter.getInitialState(),
  reducers: {
    removeOneSpeaker: activeSpeakerAdapter.removeOne,
    addOrUpdateSpeaker: activeSpeakerAdapter.upsertOne,
  },
});

export const { removeOneSpeaker, addOrUpdateSpeaker } =
  activeSpeakersSlice.actions;
export default activeSpeakersSlice.reducer;
