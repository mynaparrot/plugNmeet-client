import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DroppedUser, IBreakoutRoomSlice } from './interfaces/breakoutRoom';

const initialState: IBreakoutRoomSlice = {
  droppedUser: {
    id: '',
    roomId: 0,
  },
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
    setReturningToMainRoom: (state, action: PayloadAction<boolean>) => {
      state.isReturningToMainRoom = action.payload;
    },
  },
});

export const { updateBreakoutRoomDroppedUser, setReturningToMainRoom } =
  breakoutRoomSlice.actions;

export default breakoutRoomSlice.reducer;
