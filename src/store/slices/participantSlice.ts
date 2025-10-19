import {
  createEntityAdapter,
  createSelector,
  createSlice,
} from '@reduxjs/toolkit';
import { isEqual } from 'es-toolkit';

import { RootState } from '..';
import {
  IParticipant,
  IParticipantFilteredInfo,
} from './interfaces/participant';

const participantAdapter = createEntityAdapter({
  selectId: (participant: IParticipant) => participant.userId,
  sortComparer: (a: IParticipant, b: IParticipant) =>
    a.name.localeCompare(b.name),
});

const participantsSlice = createSlice({
  name: 'participants',
  initialState: participantAdapter.getInitialState(),
  reducers: {
    addParticipant: participantAdapter.addOne,
    removeParticipant: participantAdapter.removeOne,
    updateParticipant: participantAdapter.updateOne,
  },
});

export const participantsSelector = participantAdapter.getSelectors(
  (state: RootState) => state.participants,
);

export const { addParticipant, removeParticipant, updateParticipant } =
  participantsSlice.actions;
export default participantsSlice.reducer;

// our custom selectors
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
    memoizeOptions: { resultEqualityCheck: isEqual },
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
    memoizeOptions: { resultEqualityCheck: isEqual },
  },
);

const selectParticipantWithWaitForApproval = createSelector(
  [participantsSelector.selectAll],
  (participants) =>
    participants.map(
      (p) =>
        ({
          userId: p.userId,
          name: p.name,
          isAdmin: p.metadata.isAdmin,
          waitForApproval: p.metadata.waitForApproval,
          profilePic: p.metadata.profilePic,
        }) as IParticipantFilteredInfo,
    ),
  {
    memoizeOptions: {
      resultEqualityCheck: isEqual,
    },
  },
);

export const selectFilteredParticipantsList = createSelector(
  [
    selectParticipantWithWaitForApproval,
    (state: RootState, isAdmin: boolean) => isAdmin,
    (state: RootState, isAdmin: boolean, search: string) => search,
    (
      state: RootState,
      isAdmin: boolean,
      search: string,
      allowViewOtherUsers: boolean,
    ) => allowViewOtherUsers,
    (
      state: RootState,
      isAdmin: boolean,
      search: string,
      allowViewOtherUsers: boolean,
      currentUserId: string | undefined,
    ) => currentUserId,
  ],
  (participants, isAdmin, search, allowViewOtherUsers, currentUserId) => {
    let list = participants.filter(
      (p) =>
        p.name !== '' && p.userId !== 'RECORDER_BOT' && p.userId !== 'RTMP_BOT',
    );

    if (!isAdmin && !allowViewOtherUsers) {
      list = list.filter((p) => p.isAdmin || p.userId === currentUserId);
    }

    if (search) {
      list = list.filter((p) =>
        p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      );
    }

    if (isAdmin) {
      // .sort() mutates the array, so we work on a copy.
      return list.sort((a, b) =>
        a.waitForApproval === b.waitForApproval
          ? 0
          : a.waitForApproval
            ? -1
            : 1,
      );
    }
    return list;
  },
);
