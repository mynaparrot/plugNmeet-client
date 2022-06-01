export interface IBreakoutRoomSlice {
  droppedUser: DroppedUser;
  receivedInvitationFor: string;
}

export interface DroppedUser {
  id: string;
  roomId: number;
}
