import {
  createEntityAdapter,
  createSelector,
  createSlice,
} from '@reduxjs/toolkit';
import { isEqual } from 'es-toolkit';

import { RootState } from '..';
import {
  IParticipant,
  IVisibleParticipantInfo,
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

export const selectWhiteboardParticipants = createSelector(
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

const selectParticipantsForListDisplay = createSelector(
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
        }) as IVisibleParticipantInfo,
    ),
  {
    memoizeOptions: {
      resultEqualityCheck: isEqual,
    },
  },
);

export interface IRaisedHandsQueue {
  // userId -> 1-based position in the raise order
  positions: Record<string, number>;
  // total number of currently raised hands
  count: number;
}

export const selectRaisedHandsQueue = createSelector(
  [participantsSelector.selectAll],
  (participants): IRaisedHandsQueue => {
    const raised = participants
      .filter((p) => p.metadata?.raisedHand === true)
      .sort((a, b) => {
        const at = Number(a.metadata?.raisedHandAt);
        const bt = Number(b.metadata?.raisedHandAt);
        if (at !== bt) {
          return at - bt;
        }
        return a.userId.localeCompare(b.userId);
      });

    const positions: Record<string, number> = {};
    raised.forEach((p, i) => {
      positions[p.userId] = i + 1;
    });

    return { positions, count: raised.length };
  },
  {
    memoizeOptions: { resultEqualityCheck: isEqual },
  },
);

export const selectVisibleParticipants = createSelector(
  [
    selectParticipantsForListDisplay,
    selectRaisedHandsQueue,
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
  (
    participants,
    queue,
    isAdmin,
    search,
    allowViewOtherUsers,
    currentUserId,
  ) => {
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

    // Raised hands float to the top in queue order (matches the 1/2/3 badges).
    // Returns 0 for non-raised pairs so the stable sort keeps the baseline name
    // order (entity adapter sortComparer).
    const raisedRank = (
      a: IVisibleParticipantInfo,
      b: IVisibleParticipantInfo,
    ) => {
      const pa = queue.positions[a.userId];
      const pb = queue.positions[b.userId];
      if (pa && pb) return pa - pb;
      if (pa) return -1;
      if (pb) return 1;
      return 0;
    };

    // .sort() mutates the array; `list` is already a filtered copy, so this is safe.
    if (isAdmin) {
      // waiting-room users stay on top, then raised hands, then the rest.
      return list.sort((a, b) => {
        if (a.waitForApproval !== b.waitForApproval) {
          return a.waitForApproval ? -1 : 1;
        }
        return raisedRank(a, b);
      });
    }
    return list.sort(raisedRank);
  },
);
