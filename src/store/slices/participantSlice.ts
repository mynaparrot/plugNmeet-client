import {
  createEntityAdapter,
  createSelector,
  createSlice,
} from '@reduxjs/toolkit';

import { RootState } from '..';
import { IParticipant } from './interfaces/participant';

const participantAdapter = createEntityAdapter({
  selectId: (participant: IParticipant) => participant.userId,
  sortComparer: (a: IParticipant, b: IParticipant) =>
    a.name.localeCompare(b.name),
});

export const participantsSelector = participantAdapter.getSelectors(
  (state: RootState) => state.participants,
);

export const selectBasicParticipants = createSelector(
  [participantsSelector.selectAll],
  (participants) =>
    participants.map((p) => ({
      userId: p.userId,
      sid: p.sid,
      name: p.name,
      isAdmin: !!p.metadata?.isAdmin,
    })),
  {
    memoizeOptions: {
      resultEqualityCheck: (a, b) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          const objA = a[i];
          const objB = b[i];
          if (
            objA.userId !== objB.userId ||
            objA.sid !== objB.sid ||
            objA.name !== objB.name ||
            objA.isAdmin !== objB.isAdmin
          ) {
            return false;
          }
        }
        return true;
      },
    },
  },
);

export const selectBasicParticipantsForWhiteboard = createSelector(
  [participantsSelector.selectAll],
  (participants) =>
    participants.map((p) => ({
      userId: p.userId,
      sid: p.sid,
      name: p.name,
      isAdmin: !!p.metadata?.isAdmin,
      isPresent: !!p.metadata?.isPresenter,
      isWhiteboardLocked: !!p.metadata?.lockSettings?.lockWhiteboard,
    })),
  {
    memoizeOptions: {
      resultEqualityCheck: (a, b) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          const objA = a[i];
          const objB = b[i];
          if (
            objA.userId !== objB.userId ||
            objA.sid !== objB.sid ||
            objA.name !== objB.name ||
            objA.isAdmin !== objB.isAdmin ||
            objA.isPresent !== objB.isPresent ||
            objA.isWhiteboardLocked !== objB.isWhiteboardLocked
          ) {
            return false;
          }
        }
        return true;
      },
    },
  },
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
