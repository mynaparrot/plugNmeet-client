import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DroppedUser, IBreakoutRoomSlice } from './interfaces/breakoutRoom';

const initialState: IBreakoutRoomSlice = {
  droppedUser: {
    id: '',
    roomId: 0,
  },
  receivedInvitationFor: '',
  isReturningToMainRoom: false,
};

const breakoutRoomSlice = createSlice({
  name: 'breakoutRoom',
  initialState,
  reducers: {
    updateBreakoutRoomDroppedUser: (
      state,
      action: PayloadAction<DroppedUser>,
    ) => {
      state.droppedUser = action.payload;
    },
    updateReceivedInvitationFor: (state, action: PayloadAction<string>) => {
      state.receivedInvitationFor = action.payload;
    },
    setReturningToMainRoom: (state, action: PayloadAction<boolean>) => {
      state.isReturningToMainRoom = action.payload;
    },
  },
});

export const {
  updateBreakoutRoomDroppedUser,
  updateReceivedInvitationFor,
  setReturningToMainRoom,
} = breakoutRoomSlice.actions;

export default breakoutRoomSlice.reducer;
