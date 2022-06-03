export interface CommonRes {
  status: boolean;
  msg: string;
}

export interface BreakoutRoomListsRes extends CommonRes {
  rooms?: Array<BreakoutRoom>;
}

export interface BreakoutRoom {
  id: string;
  title: string;
  duration: number;
  started: boolean;
  created: number;
  users: Array<BreakoutRoomUser>;
}

export interface BreakoutRoomUser {
  id: string;
  name: string;
  joined: boolean;
}

export interface CreateBreakoutRoomReq {
  duration: number;
  welcome_msg: string;
  rooms: Array<BreakoutRoom>;
}

export interface BreakoutRoomDurationReq {
  breakout_room_id: string;
  duration: number;
}

export interface JoinRoomReq {
  breakout_room_id: string;
  user_id: string;
  is_admin: boolean;
}

export interface JoinRoomRes extends CommonRes {
  token?: string;
}

export interface SendMsgReq {
  msg: string;
}

export interface GetMyRoomsRes extends CommonRes {
  room?: BreakoutRoom;
}
