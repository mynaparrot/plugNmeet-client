export interface IBreakoutRoomSlice {
  droppedUser: DroppedUser;
  receivedInvitationFor: string;
  isReturningToMainRoom: boolean;
}

export interface DroppedUser {
  id: string;
  roomId: number;
}
