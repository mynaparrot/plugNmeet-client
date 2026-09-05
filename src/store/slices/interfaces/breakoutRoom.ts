export interface IBreakoutRoomSlice {
  droppedUser: DroppedUser;
  isReturningToMainRoom: boolean;
}

export interface DroppedUser {
  id: string;
  roomId: number;
}
