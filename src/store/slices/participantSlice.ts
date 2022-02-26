import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { RootState } from '..';
import { IParticipant } from './interfaces/participant';

const participantAdapter = createEntityAdapter<IParticipant>({
  selectId: (participant) => participant.userId,
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});
export const participantsSelector = participantAdapter.getSelectors(
  (state: RootState) => state.participants,
);

const participantsSlice = createSlice({
  name: 'participants',
  initialState: participantAdapter.getInitialState(),
  reducers: {
    addParticipant: participantAdapter.addOne,
    removeParticipant: participantAdapter.removeOne,
    updateParticipant: participantAdapter.updateOne,
  },
});

export const { addParticipant, removeParticipant, updateParticipant } =
  participantsSlice.actions;
export default participantsSlice.reducer;
