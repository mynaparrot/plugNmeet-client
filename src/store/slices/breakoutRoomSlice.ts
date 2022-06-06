import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DroppedUser, IBreakoutRoomSlice } from './interfaces/breakoutRoom';

const initialState: IBreakoutRoomSlice = {
  droppedUser: {
    id: '',
    roomId: 0,
  },
  receivedInvitationFor: '',
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
  },
});

export const { updateBreakoutRoomDroppedUser, updateReceivedInvitationFor } =
  breakoutRoomSlice.actions;

export default breakoutRoomSlice.reducer;
