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

export const selectSpeakingParticipants = createSelector(
  (state: RootState) => activeSpeakersSelector.selectAll(state),
  (speakers) => speakers.filter((speaker) => speaker.isSpeaking),
);

export const selectIsSpeakingByUserId = (userId: string) =>
  createSelector(
    // First, we use the efficient `selectById` to get the specific speaker.
    // This selector is already provided by createEntityAdapter.
    (state: RootState) => activeSpeakersSelector.selectById(state, userId),
    // By using `!!`, we guarantee the selector always returns a boolean.
    (speaker) => {
      return !!speaker?.isSpeaking;
    },
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
