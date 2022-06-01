export interface CommonRes {
  status: boolean;
  msg: string;
}

export interface BreakoutRoomListsRes extends CommonRes {
  rooms?: Array<BreakoutRoom>;
}

export interface BreakoutRoom {
  id: string;
  users: Array<BreakoutRoomUser>;
}

export interface BreakoutRoomUser {
  id: string;
}

export interface CreateBreakoutRoomReq {
  duration: number;
  rooms: Array<BreakoutRoom>;
}

export interface BreakoutRoomDurationReq {
  id: string;
  duration: number;
}

export interface JoinRoomReq {
  breakout_room_id: string;
  user_id: string;
}

export interface JoinRoomRes extends CommonRes {
  token?: string;
}
